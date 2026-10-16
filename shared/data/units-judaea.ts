import type { UnitTemplate } from "../types.js";

/**
 * What the Jewish War adds. The Romans fight it with the army they already have;
 * the lesson of this campaign is walls and ground, so the new troops are all on
 * the other side and all defenders: men who do not need to win the field, only
 * to make taking the next hill cost more than it is worth.
 */
export const JUDAEA_UNITS = {
  zealots: {
    side: "enemy", name: "Zealot Fighters", latin: "Zelotae", glyph: "ZEL",
    men: 460, attack: 38, defense: 32, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Josephus's word for the fighters of the revolt who would not treat with Rome. Some were trained men, many were not, and all of them were fighting for their own city.",
  },
  sicarii: {
    side: "enemy", name: "Sicarii Raiders", latin: "Sicarii", glyph: "SIC",
    men: 260, attack: 46, defense: 22, move: 5, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1.2, armourPiercing: 1,
    blurb: "The 'dagger-men', named for the short blade carried under the cloak. Josephus uses the name for the most extreme of the rebels, and for the garrison that held Masada last.",
  },
  temple_guard: {
    side: "enemy", name: "Temple Garrison", latin: "Custodes", glyph: "TMP",
    men: 420, attack: 44, defense: 46, move: 3, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "The men who held the Temple Mount and the Antonia behind it. Josephus says they fought as men who believed the building could not fall while they stood in it.",
  },
  wall_archers: {
    side: "enemy", name: "Wall Archers", latin: "Sagittarii", glyph: "WLA",
    men: 320, attack: 28, defense: 20, move: 3, range: 3, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    missileVerb: "shoots from the wall at",
    blurb: "Archers and stone-throwers on the battlements. Josephus, wounded in the knee by an arrow at Jotapata, says the garrison's missiles did more harm than its swords.",
  },
} as const satisfies Record<string, UnitTemplate>;
