import type {
  BattleResult, BattleStats, CodexEntry, Objective, ObjectiveKind, ResultResponse, SaveState,
  ScenarioRecord,
} from "../shared/types.js";
import { SCENARIO_BY_ID, SCENARIOS } from "../shared/data/scenarios.js";
import { CODEX, CODEX_BY_ID } from "../shared/data/codex.js";
import { RANKS } from "../shared/data/units.js";

/** Pure progression rules: which objectives a battle met, points, codex unlocks, rank. */

export function objectiveMet(o: Objective, s: BattleStats): boolean {
  const v = o.value ?? 0;
  switch (o.kind) {
    case "win": return s.won;
    case "pila_before_melee": return s.won && s.pilaBeforeMelee;
    case "missile_losses_under": return s.won && s.missileLosses < v;
    case "cuneus_kills": return s.won && s.cuneusKills >= v;
    case "flank_kills": return s.won && s.flankKills >= v;
    case "no_cohort_routed": return s.won && s.cohortsRouted === 0;
    case "testudo_under_fire": return s.won && s.testudoTurnsUnderFire >= v;
    case "orbis_held": return s.won && s.orbisHeldTurns >= v;
    case "cavalry_kills": return s.won && s.cavalryKills >= v;
  }
}

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

const OBJECTIVE_KINDS = new Set<string>(
  SCENARIOS.flatMap((s) => s.objectives.map((o) => o.kind as string)),
);

function count(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
}

function record(raw: unknown, scenarioId: string): ScenarioRecord | null {
  if (!SCENARIO_BY_ID[scenarioId] || typeof raw !== "object" || raw === null) return null;
  const r = raw as Partial<ScenarioRecord>;
  const kinds = Array.isArray(r.objectivesMet) ? r.objectivesMet : [];
  return {
    completed: r.completed === true,
    bestPoints: count(r.bestPoints),
    attempts: count(r.attempts),
    objectivesMet: [...new Set(kinds.filter((k): k is ObjectiveKind => typeof k === "string" && OBJECTIVE_KINDS.has(k)))],
  };
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

  const met: ObjectiveKind[] = [];
  let points = 0;
  for (const o of scenario.objectives) {
    if (objectiveMet(o, result.stats)) {
      met.push(o.kind);
      points += o.points;
    }
  }

  // Points are awarded once per objective per scenario. Replays only earn newly met objectives.
  const newlyMet = met.filter((k) => !record.objectivesMet.includes(k));
  const earned = scenario.objectives
    .filter((o) => newlyMet.includes(o.kind))
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
