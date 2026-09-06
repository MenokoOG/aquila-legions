import type { BattleStats, MetricBag, Objective } from "./types.js";
import { METRICS } from "./data/metrics.js";

/**
 * The one place an objective is judged.
 *
 * It used to be two: `engine/objectives.ts` decided what the player saw during
 * the fight, `server/progress.ts` decided what the fight was worth, and both
 * switched over the same closed list of objective names in different packages
 * with nothing linking them. An objective is now a comparison against a metric,
 * so both sides call the same comparator and a new objective is a row of data.
 */

/** The comparison alone, with no view on whether the battle was won. */
export function testObjective(o: Objective, m: MetricBag): boolean {
  const have = m[o.metric];
  const need = o.value ?? 0;
  switch (o.compare) {
    // The battle being won is the whole test. `objectiveMet` applies that, and
    // a scenario is free to win by lasting or by getting away rather than by
    // clearing the field, so this cannot look at a count of the enemy.
    case "victory": return true;
    case "gte": return have >= need;
    case "lt": return have < need;
    case "zero": return have === 0;
  }
}

/**
 * Whether a finished battle met this objective. Nothing scores in a defeat:
 * a lesson only counts if the field was taken while it was being learned.
 */
export function objectiveMet(o: Objective, stats: BattleStats): boolean {
  return stats.won && testObjective(o, stats.metrics);
}

export type ObjectiveStatus = "done" | "failed" | "pending";

/**
 * Live status, mid-battle. Every metric only ever climbs, which is what makes
 * this decidable early: a count that has reached its target can never fall back
 * below it, and a cap that has been breached can never be un-breached.
 */
export function objectiveStatus(
  o: Objective, m: MetricBag, over: { won: boolean } | null,
): ObjectiveStatus {
  if (o.compare === "victory") return over ? (over.won ? "done" : "failed") : "pending";
  if (o.compare === "gte") return testObjective(o, m) ? "done" : "pending";
  // A cap or a must-stay-clean. Breaking it is final; holding it is only settled
  // once there is no way left to break it, which is the end of the battle unless
  // the objective names the work that would have to go wrong.
  if (!testObjective(o, m)) return "failed";
  if (o.outstanding && m[o.outstanding] === 0) return "done";
  return over?.won ? "done" : "pending";
}

/** The short right-aligned readout beside the objective, e.g. "2 / 3". */
export function objectiveDetail(o: Objective, m: MetricBag): string {
  const have = m[o.metric];
  const need = o.value ?? 0;
  switch (o.compare) {
    case "victory":
      return have === 0 ? METRICS.enemiesLeft.clean : `${have} ${METRICS.enemiesLeft.label}`;
    case "gte":
      return `${have} / ${need}`;
    case "lt":
      return `${have} / under ${need}`;
    case "zero": {
      if (have > 0) return `${have} ${METRICS[o.metric].label}`;
      if (o.outstanding) {
        const left = m[o.outstanding];
        return left === 0 ? METRICS[o.outstanding].clean : `${left} ${METRICS[o.outstanding].label}`;
      }
      return METRICS[o.metric].clean;
    }
  }
}
