import type { UnitKind, UnitTemplate } from "../types.js";

/** Unit roster. Numbers are game balance, not census figures. Blurbs are the history. */
export const UNITS: Record<UnitKind, UnitTemplate> = {
  cohort: {
    kind: "cohort", side: "rome", name: "Legionary Cohort", latin: "Cohors",
    men: 480, attack: 42, defense: 48, move: 3, range: 0, pila: 1, canFormation: true,
    blurb: "Six centuries of 80 men. Scutum, lorica segmentata, two pila, gladius. The building block of the Imperial legion.",
  },
  first_cohort: {
    kind: "first_cohort", side: "rome", name: "First Cohort", latin: "Cohors Prima",
    men: 800, attack: 50, defense: 52, move: 3, range: 0, pila: 1, canFormation: true,
    blurb: "Five double-strength centuries of veterans. Carried the legion's eagle, the aquila. Losing it was a disgrace beyond recovery.",
  },
  aux_infantry: {
    kind: "aux_infantry", side: "rome", name: "Auxiliary Cohort", latin: "Cohors Auxiliaria",
    men: 480, attack: 34, defense: 38, move: 4, range: 0, pila: 0, canFormation: false,
    blurb: "Non-citizen troops with an oval shield and spear. Faster and cheaper than legionaries; earned citizenship after 25 years.",
  },
  aux_archers: {
    kind: "aux_archers", side: "rome", name: "Syrian Archers", latin: "Sagittarii",
    men: 400, attack: 30, defense: 22, move: 3, range: 3, pila: 0, canFormation: false,
    blurb: "Eastern auxiliaries with composite bows. Trajan's Column shows them in conical helmets and long tunics.",
  },
  ala_cavalry: {
    kind: "ala_cavalry", side: "rome", name: "Auxiliary Cavalry", latin: "Ala",
    men: 360, attack: 40, defense: 34, move: 6, range: 0, pila: 0, canFormation: false,
    blurb: "Gallic and Thracian horsemen. Rome's legions were infantry; the auxilia supplied the wings that turned a flank.",
  },
  scorpio: {
    kind: "scorpio", side: "rome", name: "Scorpio Battery", latin: "Scorpiones",
    men: 120, attack: 44, defense: 18, move: 1, range: 4, pila: 0, canFormation: false,
    blurb: "Torsion bolt-throwers, roughly one per century. Accurate to 100 metres and lethal against dense infantry.",
  },
  warband: {
    kind: "warband", side: "dacia", name: "Dacian Warband", latin: "Comati",
    men: 520, attack: 36, defense: 30, move: 4, range: 0, pila: 0, canFormation: false,
    blurb: "The 'long-haired' free Dacians. Brave, loosely ordered, and dangerous in the first rush.",
  },
  falxmen: {
    kind: "falxmen", side: "dacia", name: "Falxmen", latin: "Falx",
    men: 400, attack: 48, defense: 26, move: 4, range: 0, pila: 0, canFormation: false,
    blurb: "Two-handed curved blades that could reach over a shield. Rome added cross-bracing to helmets and arm guards because of them.",
  },
  dacian_archers: {
    kind: "dacian_archers", side: "dacia", name: "Dacian Archers", latin: "Sagittarii Daci",
    men: 380, attack: 28, defense: 20, move: 4, range: 3, pila: 0, canFormation: false,
    blurb: "Hill archers who harassed columns in the Carpathian passes. Answered by the testudo.",
  },
  cataphracts: {
    kind: "cataphracts", side: "dacia", name: "Sarmatian Cataphracts", latin: "Cataphractarii",
    men: 300, attack: 52, defense: 44, move: 5, range: 0, pila: 0, canFormation: false,
    blurb: "Roxolani allies of Decebalus, horse and rider in scale armour. A charge could break loose infantry; a steady line could stop it.",
  },
};

export const FORMATION_INFO: Record<
  string,
  { name: string; latin: string; short: string; history: string }
> = {
  line: {
    name: "Battle Line", latin: "Acies", short: "Balanced. Full move.",
    history: "The cohort in ranks, usually eight deep. Every other formation is a departure from this one and a return to it.",
  },
  testudo: {
    name: "Tortoise", latin: "Testudo", short: "Blocks 3/4 of missile damage. Move 1. Weak in melee.",
    history: "Shields locked overhead and on every side. Used to approach walls and cross killing zones under arrow fire. Too slow and blind to fight in.",
  },
  cuneus: {
    name: "Wedge", latin: "Cuneus", short: "+40% attack. -25% defense.",
    history: "The 'pig's head' the soldiers called it. A narrow front driven into one point of the enemy line to split it. Exposed on both flanks once it is in.",
  },
  orbis: {
    name: "Circle", latin: "Orbis", short: "+35% defense. Ignores flanking. Cannot move.",
    history: "The last-resort all-round defense when surrounded or facing cavalry. Every man faces outward. It holds; it does not win.",
  },
};

export const RANKS: { min: number; title: string }[] = [
  { min: 0, title: "Tiro (Recruit)" },
  { min: 150, title: "Optio" },
  { min: 400, title: "Centurion" },
  { min: 700, title: "Primus Pilus" },
  { min: 1000, title: "Tribunus" },
  { min: 1400, title: "Legatus Legionis" },
];
