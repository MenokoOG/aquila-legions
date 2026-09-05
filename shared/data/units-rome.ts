import type { UnitTemplate } from "../types.js";

/**
 * The Roman roster. The player commands Rome in every campaign, so this file is
 * shared; an era that fields different Roman troops adds to it rather than
 * replacing it. Numbers are game balance, not census figures. Blurbs are the history.
 */
export const ROME_UNITS = {
  cohort: {
    side: "player", name: "Legionary Cohort", latin: "Cohors", glyph: "COH",
    men: 480, attack: 42, defense: 48, move: 3, range: 0, pila: 1,
    canFormation: true, core: true, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Six centuries of 80 men. Scutum, lorica segmentata, two pila, gladius. The building block of the Imperial legion.",
  },
  first_cohort: {
    side: "player", name: "First Cohort", latin: "Cohors Prima", glyph: "I",
    men: 800, attack: 50, defense: 52, move: 3, range: 0, pila: 1,
    canFormation: true, core: true, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Five double-strength centuries of veterans. Carried the legion's eagle, the aquila. Losing it was a disgrace beyond recovery.",
  },
  aux_infantry: {
    side: "player", name: "Auxiliary Cohort", latin: "Cohors Auxiliaria", glyph: "AUX",
    men: 480, attack: 34, defense: 38, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Non-citizen troops with an oval shield and spear. Faster and cheaper than legionaries; earned citizenship after 25 years.",
  },
  aux_archers: {
    side: "player", name: "Syrian Archers", latin: "Sagittarii", glyph: "SAG",
    men: 400, attack: 30, defense: 22, move: 3, range: 3, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Eastern auxiliaries with composite bows. Trajan's Column shows them in conical helmets and long tunics.",
  },
  ala_cavalry: {
    side: "player", name: "Auxiliary Cavalry", latin: "Ala", glyph: "ALA",
    men: 360, attack: 40, defense: 34, move: 6, range: 0, pila: 0,
    canFormation: false, core: false, mounted: true, chargeBonus: 1.25, armourPiercing: 1,
    blurb: "Gallic and Thracian horsemen. Rome's legions were infantry; the auxilia supplied the wings that turned a flank.",
  },
  scorpio: {
    side: "player", name: "Scorpio Battery", latin: "Scorpiones", glyph: "SCP",
    men: 120, attack: 44, defense: 18, move: 1, range: 4, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    missileVerb: "looses bolts at",
    blurb: "Torsion bolt-throwers, roughly one per century. Accurate to 100 metres and lethal against dense infantry.",
  },
} as const satisfies Record<string, UnitTemplate>;
