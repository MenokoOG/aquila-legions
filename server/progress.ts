import type {
  BattleResult, BattleStats, CodexEntry, MetricBag, ResultResponse, SaveState, ScenarioRecord,
} from "../shared/types.js";
import { objectiveMet } from "../shared/objectives.js";
import { METRIC_KEYS } from "../shared/data/metrics.js";
import { SCENARIO_BY_ID, SCENARIOS } from "../shared/data/scenarios.js";
import { CODEX, CODEX_BY_ID } from "../shared/data/codex.js";
import { RANKS } from "../shared/data/ranks.js";

/** Pure progression rules: points, codex unlocks, rank. Objectives are judged in `shared/objectives.ts`. */

export function rankFor(points: number): string {
  let title = RANKS[0]?.title ?? "Tiro (Recruit)";
  for (const r of RANKS) if (points >= r.min) title = r.title;
  return title;
}

export function freshSave(): SaveState {
  return {
    version: 1,
    commander: "Legatus",
    historyPoints: 0,
    rank: "Tiro (Recruit)",
    scenarios: {},
    codexUnlocked: [],
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
  const r = raw as Partial<SaveState>;
  if (r.version !== 1) return base;

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
    version: 1,
    commander,
    historyPoints,
    rank: rankFor(historyPoints),
    scenarios,
    codexUnlocked,
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

export function isUnlocked(save: SaveState, scenarioId: string): boolean {
  const s = SCENARIO_BY_ID[scenarioId];
  if (!s) return false;
  if (s.order === 1) return true;
  const prev = SCENARIOS.find((x) => x.order === s.order - 1);
  return prev ? save.scenarios[prev.id]?.completed === true : false;
}
