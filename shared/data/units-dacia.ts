import type { UnitTemplate } from "../types.js";

/** The enemy roster for the Dacian Wars campaign, 101 to 106 AD. */
export const DACIA_UNITS = {
  warband: {
    side: "enemy", name: "Dacian Warband", latin: "Comati", glyph: "WAR",
    men: 520, attack: 36, defense: 30, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "The 'long-haired' free Dacians. Brave, loosely ordered, and dangerous in the first rush.",
  },
  falxmen: {
    side: "enemy", name: "Falxmen", latin: "Falx", glyph: "FLX",
    men: 400, attack: 48, defense: 26, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 0.7,
    blurb: "Two-handed curved blades that could reach over a shield. Rome added cross-bracing to helmets and arm guards because of them.",
  },
  dacian_archers: {
    side: "enemy", name: "Dacian Archers", latin: "Sagittarii Daci", glyph: "ARC",
    men: 380, attack: 28, defense: 20, move: 4, range: 3, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Hill archers who harassed columns in the Carpathian passes. Answered by the testudo.",
  },
  cataphracts: {
    side: "enemy", name: "Sarmatian Cataphracts", latin: "Cataphractarii", glyph: "CAT",
    men: 300, attack: 52, defense: 44, move: 5, range: 0, pila: 0,
    canFormation: false, core: false, mounted: true, chargeBonus: 1.5, armourPiercing: 1,
    blurb: "Roxolani allies of Decebalus, horse and rider in scale armour. A charge could break loose infantry; a steady line could stop it.",
  },
} as const satisfies Record<string, UnitTemplate>;
