import type { UnitTemplate } from "../types.js";

/**
 * Everything the Boudican Revolt adds, on both sides.
 *
 * The shape of the British army is the campaign's whole lesson. It is enormous and it
 * is brittle: Tacitus puts the Britons at many times the Roman number and has
 * the whole host come apart at once when the front gave way, penned against its
 * own wagons. So the warhost is the biggest unit in the game and the least able
 * to stand a neighbour breaking, and the numbers say that rather than a rule
 * about Britons saying it.
 */
export const BRITANNIA_UNITS = {
  britons_warhost: {
    side: "enemy", name: "British Warhost", latin: "Britanni", glyph: "HST",
    men: 900, attack: 30, defense: 22, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    brittle: true,
    blurb: "Free men of the Iceni and Trinovantes with spear and long shield, in numbers no Roman account agrees on. Terrifying in the first rush and unable to do anything else.",
  },
  iceni_nobles: {
    side: "enemy", name: "Iceni Nobles", latin: "Nobiles Icenorum", glyph: "ICE",
    men: 380, attack: 48, defense: 38, move: 4, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1.2, armourPiercing: 1,
    blurb: "The queen's own, in mail taken or traded from Rome. The only part of the host that fought as a formed body, and the last part of it to break.",
  },
  essedarii: {
    side: "enemy", name: "War Chariots", latin: "Essedarii", glyph: "ESS",
    men: 240, attack: 42, defense: 24, move: 6, range: 0, pila: 0,
    canFormation: false, core: false, mounted: true, chargeBonus: 1.45, armourPiercing: 1,
    brittle: true,
    blurb: "Caesar describes the British method exactly: drive along the line throwing, then jump down and fight on foot while the driver waits to carry you out. Rome had met nothing like it and wrote it down.",
  },
  britons_slingers: {
    side: "enemy", name: "British Slingers", latin: "Funditores", glyph: "FND",
    men: 300, attack: 26, defense: 18, move: 4, range: 3, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    brittle: true, missileVerb: "slings stones at",
    blurb: "The hillforts of southern Britain held tens of thousands of sling stones, graded and stockpiled. Maiden Castle's hoard was still there to be dug up.",
  },
  colonia_veterans: {
    side: "player", name: "Colonia Veterans", latin: "Veterani", glyph: "VET",
    men: 280, attack: 32, defense: 34, move: 3, range: 0, pila: 0,
    canFormation: true, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Time-served legionaries settled on land taken from the Trinovantes at Camulodunum. Old, out of practice, and the only soldiers the colony had when it came.",
  },
  refugees: {
    side: "player", name: "Londinium Refugees", latin: "Fugitivi", glyph: "REF",
    men: 200, attack: 0, defense: 14, move: 3, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "Paulinus reached Londinium, judged that he could not hold it, and marched out again. Tacitus says those who could keep up with the column went with it, and that the old and the women who stayed were killed to a person.",
  },
  wagon_line: {
    side: "enemy", name: "The Wagon Line", latin: "Carrago", glyph: "WGN",
    men: 220, attack: 0, defense: 42, move: 0, range: 0, pila: 0,
    canFormation: false, core: false, mounted: false, chargeBonus: 1, armourPiercing: 1,
    blurb: "The families came to watch, and drew their wagons up across the back of the field to see it from. When the host turned to run, that was the wall it ran into. Tacitus says the animals in the traces added to the slaughter.",
  },
} as const satisfies Record<string, UnitTemplate>;
