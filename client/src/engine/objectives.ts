import type { Objective } from "../../../shared/types.js";
import { type BattleState, faction, isCore, unitsOf } from "./battle.js";

/**
 * Live objective progress, read straight off the trackers the rules already keep.
 * The server still has the last word on points; this is so the player can see,
 * mid-battle, whether the thing the scenario is teaching is actually happening.
 */

export type ObjectiveStatus = "done" | "failed" | "pending";

export interface ObjectiveProgress {
  objective: Objective;
  status: ObjectiveStatus;
  /** Short right-aligned readout, e.g. "2 / 3" or "180 lost". */
  detail: string;
  /** Shown in the after-action review when the objective was missed. */
  hint: string;
}

function counted(o: Objective, have: number, hint: string): ObjectiveProgress {
  const need = o.value ?? 0;
  return {
    objective: o,
    status: have >= need ? "done" : "pending",
    detail: `${have} / ${need}`,
    hint,
  };
}

export function objectiveProgress(o: Objective, s: BattleState): ObjectiveProgress {
  const t = s.track;
  switch (o.kind) {
    case "win": {
      const left = unitsOf(s, "enemy").length;
      return {
        objective: o,
        status: s.over ? (s.over.won ? "done" : "failed") : "pending",
        detail: left === 0 ? "field cleared" : `${left} enemy left`,
        hint: `Rout or destroy every ${faction(s, "enemy").adjective} unit before the turn limit. A unit breaks once it falls under a quarter of its men.`,
      };
    }
    case "pila_before_melee": {
      const cohorts = unitsOf(s, "player").filter(isCore).length;
      return {
        objective: o,
        status: t.pilaViolated ? "failed" : t.cohortsThrown.size >= cohorts && cohorts > 0 ? "done" : "pending",
        detail: t.pilaViolated ? "a cohort drew first" : `${t.cohortsThrown.size} thrown`,
        hint: "Throw pila at an adjacent enemy before that cohort ever swings a gladius. One cohort skipping the volley fails it for the whole battle.",
      };
    }
    case "missile_losses_under": {
      const cap = o.value ?? 0;
      return {
        objective: o,
        status: t.missileLosses >= cap ? "failed" : "pending",
        detail: `${t.missileLosses} / under ${cap}`,
        hint: "Form testudo before you walk into bow range, and drop back to line only once you are past it.",
      };
    }
    case "cuneus_kills":
      return counted(o, t.cuneusKills, "Set a cohort to cuneus (wedge) and let that cohort land the blow that breaks the enemy unit.");
    case "flank_kills":
      return counted(o, t.flankKills, "Get two units adjacent to the same enemy, then break it. Orbis cannot be flanked.");
    case "no_cohort_routed":
      return {
        objective: o,
        status: t.cohortsRouted > 0 ? "failed" : "pending",
        detail: t.cohortsRouted > 0 ? `${t.cohortsRouted} routed` : "line holds",
        hint: "Pull a battered cohort out of contact before it drops under a quarter strength. Auxiliaries routing does not count against you.",
      };
    case "testudo_under_fire":
      return counted(o, t.testudoTurnsUnderFire, `End your turn with a cohort in testudo while ${faction(s, "enemy").adjective} archers can still reach it. Each such cohort-turn counts once.`);
    case "orbis_held":
      return counted(o, t.orbisHeldTurns, "End your turn with a cohort in orbis and horsemen adjacent to it. Orbis cannot move, so form it where the charge will arrive.");
    case "cavalry_kills":
      return counted(o, t.cavalryKills, "Let the ala land the killing blow. Charge two or more hexes for the bonus, and go around the flank rather than into the front.");
  }
}

export function allProgress(s: BattleState): ObjectiveProgress[] {
  return s.scenario.objectives.map((o) => objectiveProgress(o, s));
}
