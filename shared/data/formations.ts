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
  orbis: {
    name: "Circle", latin: "Orbis", short: "+35% defense. Ignores flanking. Cannot move.",
    history: "The last-resort all-round defense when surrounded or facing cavalry. Every man faces outward. It holds; it does not win.",
    attackMul: 0.8, defenseMul: 1.35, missileMul: 1, moveOverride: 0,
    ignoresFlanking: true, blocksPila: false,
  },
};

/** The order formations are offered in the orders panel, and on keys 1-4. */
export const FORMATION_ORDER: Formation[] = ["line", "testudo", "cuneus", "orbis"];
