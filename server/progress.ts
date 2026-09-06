import type {
  BattleResult, BattleStats, CodexEntry, CommentariusEntry, MetricBag, ResultResponse, SaveState,
  ScenarioRecord,
} from "../shared/types.js";
import { objectiveMet } from "../shared/objectives.js";
import { METRIC_KEYS } from "../shared/data/metrics.js";
import { SCENARIO_BY_ID, SCENARIOS, scenariosOf } from "../shared/data/scenarios.js";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX, CODEX_BY_ID } from "../shared/data/codex.js";
import { RANKS } from "../shared/data/ranks.js";

/** Pure progression rules: points, codex unlocks, rank. Objectives are judged in `shared/objectives.ts`. */

export function rankFor(points: number): string {
  let title = RANKS[0]?.title ?? "Tiro (Recruit)";
  for (const r of RANKS) if (points >= r.min) title = r.title;
  return title;
}

/** The save shape this build writes. A v1 file on disk is migrated on read. */
export const SAVE_VERSION = 2;

export function freshSave(): SaveState {
  return {
    version: 2,
    commander: "Legatus",
    historyPoints: 0,
    rank: "Tiro (Recruit)",
    scenarios: {},
    codexUnlocked: [],
    commentarii: [],
    battles: 0,
    updatedAt: new Date().toISOString(),
  };
}

/** Every objective id the shipped scenarios use. Anything else in a save is dropped. */
const OBJECTIVE_IDS = new Set<string>(
  SCENARIOS.flatMap((s) => s.objectives.map((o) => o.id)),
);

function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function record(raw: unknown, scenarioId: string): ScenarioRecord | null {
  if (!SCENARIO_BY_ID[scenarioId] || typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<ScenarioRecord>;
  const met = Array.isArray(r.objectivesMet) ? r.objectivesMet : [];
  return {
    completed: r.completed === true,
    bestPoints: count(r.bestPoints),
    attempts: count(r.attempts),
    objectivesMet: [...new Set(met.filter((id): id is string => typeof id === "string" && OBJECTIVE_IDS.has(id)))],
  };
}

/** The blank line between a codex entry's paragraphs when it is filed as one note. */
const BLANK_LINE = "\n\n";

/** How long a note may be before it is cut. Nothing in the game writes near this. */
const NOTE_LIMIT = 2000;
const NOTEBOOK_LIMIT = 500;

const SOURCES = new Set(["trigger", "codex", "tip"]);

function text(v: unknown, limit: number): string {
  return typeof v === "string" ? v.trim().slice(0, limit) : "";
}

/**
 * The notebook is written by the client and read back by it, so it is cleaned
 * on the way in like everything else: entries without an id or a title are
 * dropped, the same id is never filed twice, and the oldest go first if it ever
 * grows past the limit.
 */
export function sanitizeCommentarii(raw: unknown): CommentariusEntry[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CommentariusEntry[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const e = item as Partial<CommentariusEntry>;
    const id = text(e.id, 64);
    const title = text(e.title, 120);
    if (!id || !title || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      source: SOURCES.has(e.source as string) ? e.source as CommentariusEntry["source"] : "tip",
      title,
      body: text(e.body, NOTE_LIMIT),
      tags: Array.isArray(e.tags)
        ? [...new Set(e.tags.filter((t): t is string => typeof t === "string").map((t) => t.trim().slice(0, 32)))].slice(0, 8)
        : [],
      scenarioId: SCENARIO_BY_ID[text(e.scenarioId, 64)] ? text(e.scenarioId, 64) : "",
      at: text(e.at, 40) || new Date().toISOString(),
    });
  }
  return out.slice(-NOTEBOOK_LIMIT);
}

/**
 * The battle report arrives over HTTP, so it is read the same way the save file
 * is: every metric is present, whole and non-negative, whatever was posted.
 */
export function sanitizeStats(raw: unknown): BattleStats {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<BattleStats>;
  const posted = (typeof r.metrics === "object" && r.metrics !== null ? r.metrics : {}) as Partial<MetricBag>;
  const metrics = {} as MetricBag;
  for (const k of METRIC_KEYS) metrics[k] = count(posted[k]);
  return { won: r.won === true, metrics };
}

/**
 * Turns whatever is in the save file into a save the game can trust: unknown
 * scenarios and codex ids are dropped, counts are clamped to whole non-negative
 * numbers, and rank is recomputed from points rather than believed.
 */
export function sanitizeSave(raw: unknown): SaveState {
  const base = freshSave();
  if (typeof raw !== "object" || raw === null) return base;
  const r = raw as Omit<Partial<SaveState>, "version"> & { version?: unknown };
  // v1 knew nothing about the Commentarii. Reading one is the migration: every
  // other field is unchanged, so an old campaign keeps its points and its codex
  // and gains an empty notebook. `SaveStore` keeps a copy of the v1 file first.
  if (r.version !== 1 && r.version !== 2) return base;

  const scenarios: Record<string, ScenarioRecord> = {};
  for (const [id, value] of Object.entries(r.scenarios ?? {})) {
    const rec = record(value, id);
    if (rec) scenarios[id] = rec;
  }

  const known = new Set(CODEX.map((e) => e.id));
  const codexUnlocked = Array.isArray(r.codexUnlocked)
    ? [...new Set(r.codexUnlocked.filter((id): id is string => typeof id === "string" && known.has(id)))]
    : [];

  const historyPoints = count(r.historyPoints);
  const commander = typeof r.commander === "string" && r.commander.trim() ? r.commander.trim().slice(0, 32) : base.commander;

  return {
    version: 2,
    commander,
    historyPoints,
    rank: rankFor(historyPoints),
    scenarios,
    codexUnlocked,
    commentarii: sanitizeCommentarii(r.commentarii),
    battles: count(r.battles),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : base.updatedAt,
  };
}

export function applyResult(save: SaveState, result: BattleResult): ResultResponse {
  const scenario = SCENARIO_BY_ID[result.scenarioId];
  if (!scenario) throw new Error(`unknown scenario ${result.scenarioId}`);

  const record = save.scenarios[scenario.id] ?? {
    completed: false, bestPoints: 0, attempts: 0, objectivesMet: [],
  };
  record.attempts += 1;
  save.battles += 1;

  const met: string[] = [];
  let points = 0;
  for (const o of scenario.objectives) {
    if (objectiveMet(o, result.stats)) {
      met.push(o.id);
      points += o.points;
    }
  }

  // Points are awarded once per objective per scenario. Replays only earn newly met objectives.
  const newlyMet = met.filter((id) => !record.objectivesMet.includes(id));
  const earned = scenario.objectives
    .filter((o) => newlyMet.includes(o.id))
    .reduce((sum, o) => sum + o.points, 0);

  record.objectivesMet = Array.from(new Set([...record.objectivesMet, ...met]));
  record.bestPoints = Math.max(record.bestPoints, points);
  if (result.stats.won) record.completed = true;
  save.scenarios[scenario.id] = record;

  const before = save.rank;
  save.historyPoints += earned;
  save.rank = rankFor(save.historyPoints);

  const newCodex: CodexEntry[] = [];
  if (result.stats.won) {
    for (const id of scenario.unlocksCodex) {
      if (!save.codexUnlocked.includes(id)) {
        const entry = CODEX_BY_ID[id];
        if (entry) {
          save.codexUnlocked.push(id);
          newCodex.push(entry);
          save.commentarii.push({
            id: `codex:${entry.id}`,
            source: "codex",
            title: entry.title,
            body: entry.body.join(BLANK_LINE),
            tags: entry.tags,
            scenarioId: scenario.id,
            at: new Date().toISOString(),
          });
        }
      }
    }
  }

  return {
    save,
    pointsEarned: earned,
    objectivesMet: met,
    newCodex,
    rankUp: save.rank !== before ? save.rank : null,
  };
}

/**
 * Whether an era is open. The first always is; a later one waits on the last
 * battle of the one before it, so the campaigns are a sequence and `order`
 * inside a campaign stays a position within that campaign.
 */
export function isCampaignUnlocked(save: SaveState, campaignId: string): boolean {
  const campaign = CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) return false;
  if (campaign.order <= 1) return true;
  const previous = CAMPAIGNS.find((c) => c.order === campaign.order - 1);
  if (!previous) return true;
  const last = scenariosOf(previous.id).at(-1);
  return last ? save.scenarios[last.id]?.completed === true : true;
}

export function isUnlocked(save: SaveState, scenarioId: string): boolean {
  const s = SCENARIO_BY_ID[scenarioId];
  if (!s) return false;
  if (!isCampaignUnlocked(save, s.campaignId)) return false;
  if (s.order === 1) return true;
  const prev = scenariosOf(s.campaignId).find((x) => x.order === s.order - 1);
  return prev ? save.scenarios[prev.id]?.completed === true : false;
}
