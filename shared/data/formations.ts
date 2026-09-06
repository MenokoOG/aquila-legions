import type { Formation, FormationDef } from "../types.js";

/**
 * Formations as data. Every number here used to be a literal inside
 * `engine/rules.ts`; combat now reads the table instead of branching on the
 * formation's name, which is what lets a later campaign add one without
 * touching the rules.
 */
export const FORMATIONS: Record<Formation, FormationDef> = {
  line: {
    name: "Battle Line", latin: "Acies", short: "Balanced. Full move.",
    history: "The cohort in ranks, usually eight deep. Every other formation is a departure from this one and a return to it.",
    attackMul: 1, defenseMul: 1, missileMul: 1, moveOverride: null,
    ignoresFlanking: false, blocksPila: false,
  },
  testudo: {
    name: "Tortoise", latin: "Testudo", short: "Blocks 3/4 of missile damage. Move 1. Weak in melee.",
    history: "Shields locked overhead and on every side. Used to approach walls and cross killing zones under arrow fire. Too slow and blind to fight in.",
    attackMul: 0.7, defenseMul: 1, missileMul: 0.25, moveOverride: 1,
    ignoresFlanking: false, blocksPila: true,
  },
  cuneus: {
    name: "Wedge", latin: "Cuneus", short: "+40% attack. -25% defense.",
    history: "The 'pig's head' the soldiers called it. A narrow front driven into one point of the enemy line to split it. Exposed on both flanks once it is in.",
    attackMul: 1.4, defenseMul: 0.75, missileMul: 1, moveOverride: null,
    ignoresFlanking: false, blocksPila: false,
  },
  march_column: {
    name: "Marching Column", latin: "Agmen", short: "Move 5 on any ground. Half defence, and worse under missiles.",
    history: "The order of march, not of battle: a legion strung out along a road, baggage and all. Tacitus has Legio IX destroyed in one because it was caught in column and never got into line.",
    attackMul: 0.7, defenseMul: 0.55, missileMul: 1.5, moveOverride: 5,
    ignoresFlanking: false, blocksPila: true,
  },
  orbis: {
    name: "Circle", latin: "Orbis", short: "+35% defense. Ignores flanking. Cannot move.",
    history: "The last-resort all-round defense when surrounded or facing cavalry. Every man faces outward. It holds; it does not win.",
    attackMul: 0.8, defenseMul: 1.35, missileMul: 1, moveOverride: 0,
    ignoresFlanking: true, blocksPila: false,
  },
};

/**
 * The formations a legion always has, in the order the orders panel offers them
 * and the keys they sit on. A scenario can name its own list; the marching
 * column is not here because it belongs to one battle, not to every battle.
 */
export const FORMATION_ORDER: Formation[] = ["line", "testudo", "cuneus", "orbis"];

/** What this scenario offers, which is the standard four unless it says otherwise. */
export function formationsFor(offered: Formation[] | undefined): Formation[] {
  return offered ?? FORMATION_ORDER;
}
