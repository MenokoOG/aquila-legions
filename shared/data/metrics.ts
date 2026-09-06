import type { Metric } from "../types.js";

/**
 * How each measurement reads on screen. The comparator in `shared/objectives.ts`
 * formats every objective's readout from this table, so a new objective needs a
 * row here at most, never a branch.
 */
export interface MetricDef {
  /** Follows a count: "2 routed", "3 thrown". */
  label: string;
  /** Stands alone when a must-stay-zero metric is still zero: "line holds". */
  clean: string;
}

export const METRICS: Record<Metric, MetricDef> = {
  enemiesLeft: { label: "enemy left", clean: "field cleared" },
  playerLosses: { label: "lost", clean: "no losses" },
  enemyLosses: { label: "enemy dead", clean: "none" },
  missileLosses: { label: "lost to missiles", clean: "untouched" },
  cuneusKills: { label: "broken by the wedge", clean: "none" },
  flankKills: { label: "broken while flanked", clean: "none" },
  cavalryKills: { label: "broken by the alae", clean: "none" },
  cohortsRouted: { label: "routed", clean: "line holds" },
  testudoTurnsUnderFire: { label: "cohort-turns under fire", clean: "none" },
  orbisHeldTurns: { label: "cohort-turns held", clean: "none" },
  cohortsYetToThrow: { label: "yet to throw", clean: "all thrown" },
  pilaVolleys: { label: "volleys thrown", clean: "none thrown" },
  pilaSkipped: { label: "drew first", clean: "volley first" },
  turns: { label: "turns", clean: "none" },
};

/** Every metric name, for building or validating a bag at runtime. */
export const METRIC_KEYS = Object.keys(METRICS) as Metric[];
