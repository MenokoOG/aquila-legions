import type { Objective } from "../../../shared/types.js";
import {
  type ObjectiveStatus, objectiveDetail, objectiveStatus,
} from "../../../shared/objectives.js";
import { type BattleState, metrics } from "./battle.js";

/**
 * Live objective progress, read straight off the metrics the rules already keep.
 * The server still has the last word on points; this is so the player can see,
 * mid-battle, whether the thing the scenario is teaching is actually happening.
 *
 * The judging itself is in `shared/objectives.ts`, which the server scores with
 * too. This file only decides what the sidebar shows.
 */

export type { ObjectiveStatus };

export interface ObjectiveProgress {
  objective: Objective;
  status: ObjectiveStatus;
  /** Short right-aligned readout, e.g. "2 / 3" or "180 lost". */
  detail: string;
  /** Shown in the after-action review when the objective was missed. */
  hint: string;
}

export function objectiveProgress(o: Objective, s: BattleState): ObjectiveProgress {
  const bag = metrics(s);
  return {
    objective: o,
    status: objectiveStatus(o, bag, s.over),
    detail: objectiveDetail(o, bag),
    hint: o.hint,
  };
}

export function allProgress(s: BattleState): ObjectiveProgress[] {
  const bag = metrics(s);
  return s.scenario.objectives.map((o) => ({
    objective: o,
    status: objectiveStatus(o, bag, s.over),
    detail: objectiveDetail(o, bag),
    hint: o.hint,
  }));
}
