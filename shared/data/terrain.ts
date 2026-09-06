import type { Terrain } from "../types.js";

/**
 * Ground, as numbers rather than as branches in the combat code.
 *
 * `moveCost` and the defence bonus were two small `if` chains inside
 * `engine/rules.ts`. They are here for the same reason the formation table is:
 * a campaign whose whole lesson is the ground it was fought on should be able
 * to add a marsh without editing the rules.
 */
export interface TerrainDef {
  name: string;
  /** Move points to enter. `null` is impassable — nothing crosses it. */
  cost: number | null;
  /** Multiplier on the defence of whoever is standing there. */
  defense: number;
  /** Shown in the board key and the field manual. */
  blurb: string;
}

export const TERRAIN: Record<Terrain, TerrainDef> = {
  plain: {
    name: "Open ground", cost: 1, defense: 1,
    blurb: "Level enough to keep a line on. Everything else on the board is a departure from it.",
  },
  forest: {
    name: "Woodland", cost: 2, defense: 1.15,
    blurb: "Slow to cross and impossible to keep ranks in, which cuts both ways: it cannot be charged either.",
  },
  hill: {
    name: "High ground", cost: 2, defense: 1.2,
    blurb: "The oldest advantage there is. Uphill is slower to reach and dearer to take.",
  },
  rough: {
    name: "Broken ground", cost: 2, defense: 1,
    blurb: "Scree, gullies, old ditches. It costs time and gives nothing back.",
  },
  marsh: {
    name: "Marsh", cost: 3, defense: 0.9,
    blurb: "Waterlogged and slow, and a shield wall standing in it is not standing on anything. Cross it on a road or not at all.",
  },
  road: {
    name: "Road", cost: 1, defense: 0.95,
    blurb: "A made surface, and the only quick way through the marshes. It also strings an army out in a line, which is what happened to the Ninth.",
  },
  cliff: {
    name: "Crag", cost: null, defense: 1,
    blurb: "Impassable. Ground you cannot be attacked across is worth as much as ground you can hold.",
  },
};

/** Move points to enter, or `null` where nothing can go. */
export function moveCostOf(t: Terrain): number | null {
  return TERRAIN[t].cost;
}

export function isBlocked(t: Terrain): boolean {
  return TERRAIN[t].cost === null;
}
