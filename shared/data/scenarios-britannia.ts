import type { Objective, Scenario } from "../types.js";
import { hexes, terrain } from "./board.js";

/**
 * The Boudican Revolt, 60 to 61 AD.
 *
 * Dacia teaches the legion's offensive tools: the volley, the tortoise, the
 * wedge, the circle. This campaign teaches the thing those tools cannot supply,
 * which is ground. Tacitus (*Annals* XIV.34) has Suetonius Paulinus take a
 * defile with woods at his back and open country in front, so that ten thousand
 * men could not be flanked and a host many times that size could not bring its
 * numbers to bear. Four of these six battles are therefore won by where you
 * stand, when you leave, or what you decline to do — not by clearing the field.
 *
 * Tuning. This campaign is a lesson, not a contest, so each battle is set to the
 * point where playing it the way its own `lesson` says wins most of the time.
 * The enemy level is chosen for that, not for a ramp: the host that comes
 * straight at you is both the easiest opponent and the one Tacitus describes.
 * Where a battle was still lost by the taught play, the host was thinned or the
 * bar lowered, and the thinner host is noted on the scenario.
 */

const HINT_GROUND =
  "Fight where the enemy cannot use his numbers. A flank that rests on a crag or a wood is a flank that cannot be turned.";

const win = (text: string, points: number, hint = HINT_GROUND): Objective => ({
  id: "win", text, metric: "enemiesLeft", compare: "victory", points, hint,
});

/** A battle won by lasting, not by winning. */
const survive = (text: string, turns: number, points: number): Objective => ({
  id: "survive", text, metric: "turnsSurvived", compare: "gte", value: turns, points,
  hint: "You are not going to beat them. Trade ground for turns: fall back through the buildings, make them come to you one side at a time, and be alive at the end.",
});

const holdGround = (text: string, count: number, points: number): Objective => ({
  id: "hold_ground", text, metric: "keyHexesHeld", compare: "gte", value: count, points,
  hint: "Stand on the marked hexes when the fighting stops. A unit that wandered off to chase a kill is a unit that is not holding anything.",
});

const getAway = (id: string, text: string, count: number, points: number): Objective => ({
  id, text, metric: "unitsExtracted", compare: "gte", value: count, points,
  hint: "End a move on a marked exit hex and that unit walks off the board and is safe. Getting away is the win here; the men you leave behind are not coming.",
});

const lossesUnder = (text: string, value: number, points: number): Objective => ({
  id: "losses_under", text, metric: "playerLosses", compare: "lt", value, points,
  hint: "Rotate a battered unit out of contact before it is broken, and do not buy ground with men you will need later.",
});

const restraint = (text: string, value: number, points: number): Objective => ({
  id: "restraint", text, metric: "enemyLosses", compare: "lt", value, points,
  hint: "A unit routs at a quarter strength and leaves the field alive. Break them and let them go: every man you kill past that is a man Classicianus will write to Nero about.",
});

const noCohortRouted = (text: string, points: number): Objective => ({
  id: "no_cohort_routed", text, metric: "cohortsRouted", compare: "zero", points,
  hint: "Pull a battered cohort out of contact before it drops under a quarter strength. Auxiliaries and veterans routing does not count against you.",
});

const flankKills = (text: string, value: number, points: number): Objective => ({
  id: "flank_kills", text, metric: "flankKills", compare: "gte", value, points,
  hint: "Get two units adjacent to the same warhost, then break it. A host packed too tight to turn is a host that can be taken from the side.",
});

const pilaFirst = (text: string, points: number): Objective => ({
  id: "pila_before_melee", text, metric: "pilaSkipped", compare: "zero", outstanding: "cohortsYetToThrow", points,
  hint: "Throw pila at an adjacent enemy before that cohort ever swings a gladius. Against a mass coming at a run, the volley is worth more than the sword.",
});

const W = 14;
const H = 10;

export const BRITANNIA_SCENARIOS: Scenario[] = [
  {
    id: "camulodunum", campaignId: "britannia", order: 1,
    title: "The Temple of Claudius", year: "60 AD", place: "Camulodunum, the colonia",
    briefing: "The colony has no wall. It was never given one: a colony of veterans was supposed to be its own wall. The Iceni and the Trinovantes are already in the streets, and everything left of Camulodunum is the temple precinct and the old soldiers standing on its steps. Hold it. Help is on the road.",
    tactic: "Delay as a victory",
    lesson: "You cannot win this. You can last. Survive to the end of the turn limit with the temple still held and the battle is a Roman victory, whatever the field looks like. Falling back is a legitimate order, and standing on the marked ground at the end is what counts.",
    // Four turns is all three old cohorts can stand against three warhosts; the
    // clock says the same so a win reads as the end of the day, not a reprieve.
    width: W, height: H, maxTurns: 4, ai: "raw",
    terrain: terrain({
      // The precinct on its podium, the burnt streets around it, the ditch behind.
      cliff: [[5, 3], [5, 6], [8, 3], [8, 6]],
      rough: [[4, 4], [4, 5], [9, 4], [9, 5], [6, 2], [7, 7]],
      forest: [[0, 0], [1, 0], [0, 9], [13, 0], [13, 9]],
      hill: [[6, 4], [7, 4], [6, 5], [7, 5]],
    }),
    keyHexes: hexes([[6, 4], [7, 4], [6, 5], [7, 5]]),
    victory: {
      metric: "turnsSurvived", compare: "gte", value: 4,
      text: "Hold the precinct until the end.",
    },
    player: [
      { kind: "colonia_veterans", at: { q: 6, r: 4 }, label: "Veterani I" },
      { kind: "colonia_veterans", at: { q: 7, r: 5 }, label: "Veterani II" },
      { kind: "aux_infantry", at: { q: 7, r: 4 }, label: "Coh. I Vangionum" },
    ],
    enemy: [
      { kind: "britons_warhost", at: { q: 1, r: 4 } },
      { kind: "britons_warhost", at: { q: 1, r: 6 } },
      { kind: "britons_warhost", at: { q: 12, r: 4 } },
      { kind: "britons_slingers", at: { q: 2, r: 2 } },
      { kind: "britons_slingers", at: { q: 11, r: 7 } },
    ],
    objectives: [
      survive("Hold the precinct for 4 turns", 4, 150),
      holdGround("Stand on the temple podium at the end", 2, 75),
      lossesUnder("Lose fewer than 400 men", 400, 50),
    ],
    unlocksCodex: ["boudica", "camulodunum"],
  },
  {
    id: "ninth", campaignId: "britannia", order: 2,
    title: "The Ninth on the Road", year: "60 AD", place: "The road south from Lindum",
    briefing: "Petillius Cerialis has brought what he could of Legio IX Hispana down the road at speed, and speed is the whole of the problem: the legion is strung out along it in column, baggage and all, and the woods on both sides are full. Get what you can out to the west. Tacitus says the infantry did not get out.",
    tactic: "A column is not a line",
    lesson: "Marching Column moves 5 on any ground and is close to defenceless. It is how you cover distance and it is the worst possible thing to be caught in. Drop to Line the moment contact is likely, and take the units you can save off the western exits.",
    // Veteran here on purpose: a host that forms up before it commits gives the
    // column the head start that a straight rush does not. One chariot fewer
    // than the field once held: the ambush is the lesson, not the annihilation.
    width: W, height: H, maxTurns: 10, ai: "veteran",
    formations: ["line", "march_column", "testudo", "orbis"],
    terrain: terrain({
      road: [[0, 5], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5], [8, 5], [9, 5], [10, 5], [11, 5], [12, 5], [13, 5]],
      forest: [
        [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
        [3, 7], [4, 7], [5, 7], [6, 7], [7, 7], [8, 7], [9, 7],
        [5, 2], [8, 2], [5, 8], [8, 8],
      ],
      marsh: [[6, 4], [7, 4], [10, 4], [6, 6], [7, 6], [10, 6]],
    }),
    exits: hexes([[0, 4], [0, 5], [0, 6]]),
    victory: {
      metric: "unitsExtracted", compare: "gte", value: 2,
      text: "Get two units off the western road.",
    },
    player: [
      { kind: "cohort", at: { q: 8, r: 5 }, label: "Coh. II Hispana" },
      { kind: "cohort", at: { q: 10, r: 5 }, label: "Coh. III Hispana" },
      { kind: "cohort", at: { q: 12, r: 5 }, label: "Coh. IV Hispana" },
      { kind: "ala_cavalry", at: { q: 13, r: 4 }, label: "Ala Petriana" },
    ],
    enemy: [
      { kind: "essedarii", at: { q: 4, r: 3 } },
      { kind: "britons_warhost", at: { q: 6, r: 3 } },
      { kind: "britons_warhost", at: { q: 6, r: 7 } },
      { kind: "britons_slingers", at: { q: 9, r: 3 } },
      { kind: "britons_slingers", at: { q: 9, r: 7 } },
    ],
    objectives: [
      getAway("extract", "Get 2 units off the western road", 2, 150),
      getAway("extract_all", "Get 3 out, cavalry included", 3, 75),
      lossesUnder("Lose fewer than 600 men on the road", 600, 50),
    ],
    unlocksCodex: ["ninth_hispana", "roman_roads"],
  },
  {
    id: "londinium", campaignId: "britannia", order: 3,
    title: "Londinium Given Up", year: "61 AD", place: "The road out of Londinium",
    briefing: "Paulinus came to Londinium ahead of his army, looked at it, and decided it could not be held. The order is to abandon the town. Those who can march may march with the column; the column will not wait, and the Britons are already on the road behind it. Get the people out.",
    tactic: "Escort under pressure",
    lesson: "Two of your units cannot fight at all. Screening is a positional problem, not a combat one: the cohorts have to be between the refugees and the chariots, and every turn you spend killing is a turn the refugees are not walking. Exit hexes are on the west edge.",
    width: W, height: H, maxTurns: 12, ai: "raw",
    terrain: terrain({
      road: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4]],
      marsh: [[4, 2], [5, 2], [6, 2], [4, 6], [5, 6], [6, 6], [7, 6], [3, 7], [8, 2]],
      forest: [[9, 1], [10, 1], [11, 1], [9, 8], [10, 8], [11, 8]],
      hill: [[2, 2], [2, 6]],
    }),
    exits: hexes([[0, 3], [0, 4], [0, 5]]),
    victory: {
      metric: "unitsExtracted", compare: "gte", value: 2,
      text: "Get both parties of refugees away.",
    },
    player: [
      { kind: "refugees", at: { q: 8, r: 4 }, label: "The townsfolk" },
      { kind: "refugees", at: { q: 9, r: 4 }, label: "The wounded" },
      { kind: "cohort", at: { q: 10, r: 3 }, label: "Coh. VII" },
      { kind: "cohort", at: { q: 10, r: 5 }, label: "Coh. VIII" },
      { kind: "ala_cavalry", at: { q: 11, r: 4 }, label: "Ala I Thracum" },
    ],
    enemy: [
      { kind: "essedarii", at: { q: 13, r: 2 } },
      { kind: "essedarii", at: { q: 13, r: 6 } },
      { kind: "britons_warhost", at: { q: 13, r: 4 } },
      { kind: "britons_slingers", at: { q: 12, r: 8 } },
    ],
    objectives: [
      getAway("extract", "Both parties of refugees reach the west road", 2, 150),
      getAway("extract_all", "Bring the escort out too", 5, 75),
      noCohortRouted("No legionary cohort routs", 50),
    ],
    unlocksCodex: ["londinium", "verulamium"],
  },
  {
    id: "defile", campaignId: "britannia", order: 4,
    title: "Choosing the Ground", year: "61 AD", place: "A defile somewhere on Watling Street",
    briefing: "The army is together at last and it is still far too small. Paulinus will not fight in the open, so the question is not whether to give battle but where. He has found a defile: crags on both hands, thick woods behind, and nothing in front but open country an enemy has to cross. Take the position and let them come to you.",
    tactic: "Frontage and flank security",
    lesson: "Numbers only count if they can reach you. In a defile a host of any size can only present the width of the gap, so hold the line between the crags and let them arrive piecemeal. Your flanks cannot be turned if they rest on ground nobody can walk on.",
    // Two warhosts, not three: the gap is the lesson, and three could not be
    // broken in it before night by anyone but an expert.
    width: W, height: H, maxTurns: 14, ai: "seasoned",
    terrain: terrain({
      cliff: [[5, 0], [5, 1], [5, 2], [6, 0], [6, 1], [5, 7], [5, 8], [5, 9], [6, 8], [6, 9]],
      forest: [[0, 2], [0, 3], [1, 3], [0, 4], [1, 4], [0, 5], [1, 5], [0, 6], [1, 6], [0, 7]],
      hill: [[3, 4], [3, 5], [4, 4], [4, 5]],
      rough: [[7, 2], [7, 7], [8, 4], [8, 5]],
    }),
    keyHexes: hexes([[5, 3], [5, 4], [5, 5], [5, 6]]),
    deployment: {
      zone: hexes([
        [2, 3], [2, 4], [2, 5], [2, 6],
        [3, 3], [3, 4], [3, 5], [3, 6],
        [4, 3], [4, 4], [4, 5], [4, 6],
        [5, 3], [5, 4], [5, 5], [5, 6],
      ]),
      text: "The gap between the crags is four hexes wide and the woods are at your back. Set the line out before they come: what stands in the mouth is all they can reach, and everything behind it is a relief.",
    },
    player: [
      { kind: "first_cohort", at: { q: 3, r: 4 }, label: "Coh. I (Aquila)" },
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. II" },
      { kind: "cohort", at: { q: 3, r: 5 }, label: "Coh. III" },
      { kind: "aux_infantry", at: { q: 2, r: 4 }, label: "Coh. I Vangionum" },
      { kind: "ala_cavalry", at: { q: 2, r: 6 }, label: "Ala I Thracum" },
    ],
    enemy: [
      { kind: "britons_warhost", at: { q: 11, r: 3 } },
      { kind: "britons_warhost", at: { q: 11, r: 5 } },
      { kind: "iceni_nobles", at: { q: 10, r: 4 } },
      { kind: "essedarii", at: { q: 12, r: 7 } },
      { kind: "britons_slingers", at: { q: 13, r: 2 } },
    ],
    objectives: [
      win("Break them in the gap", 150),
      holdGround("Hold the mouth of the defile at the end", 3, 75),
      noCohortRouted("No legionary cohort routs", 75),
    ],
    unlocksCodex: ["defile", "paulinus"],
  },
  {
    id: "watling", campaignId: "britannia", order: 5,
    title: "Watling Street", year: "61 AD", place: "The Midlands, exact site unknown",
    briefing: "Everything is here. Tacitus gives Paulinus ten thousand men and refuses to guess at the British number beyond saying it was past counting. The families have come to watch and have drawn their wagons across the back of the field to see it from. Throw, hold, and when the front gives way, do not stop.",
    tactic: "Everything, at ten to one",
    lesson: "Volley, then hold the line, then push. This host is enormous and it is brittle: break one warhost beside another and the second may go with it, and the wagons behind them mean a host that turns to run has nowhere to run to. Break them; you do not have to kill them all.",
    // Raw is the history: Tacitus has the host come on as a mass, sure of its
    // numbers, and that is the host a first-time player can break.
    width: W, height: H, maxTurns: 16, ai: "raw",
    terrain: terrain({
      cliff: [[4, 0], [4, 1], [5, 0], [4, 8], [4, 9], [5, 9]],
      forest: [[0, 3], [0, 4], [0, 5], [0, 6], [1, 4], [1, 5]],
      hill: [[3, 4], [3, 5]],
      rough: [[6, 2], [6, 7], [7, 4], [7, 5]],
    }),
    victory: {
      metric: "enemiesLeft", compare: "lt", value: 3,
      text: "Break the host.",
    },
    player: [
      { kind: "first_cohort", at: { q: 3, r: 4 }, label: "Coh. I (Aquila)" },
      { kind: "cohort", at: { q: 2, r: 3 }, label: "Coh. II" },
      { kind: "cohort", at: { q: 2, r: 5 }, label: "Coh. III" },
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. IV" },
      { kind: "cohort", at: { q: 3, r: 6 }, label: "Coh. V" },
      { kind: "aux_infantry", at: { q: 2, r: 2 }, label: "Coh. I Vangionum" },
      { kind: "aux_infantry", at: { q: 2, r: 6 }, label: "Coh. II Batavorum" },
      { kind: "ala_cavalry", at: { q: 1, r: 2 }, label: "Ala I Thracum" },
      { kind: "ala_cavalry", at: { q: 1, r: 7 }, label: "Ala II Gallorum" },
    ],
    enemy: [
      { kind: "britons_warhost", at: { q: 8, r: 3 } },
      { kind: "britons_warhost", at: { q: 8, r: 4 } },
      { kind: "britons_warhost", at: { q: 8, r: 5 } },
      { kind: "britons_warhost", at: { q: 8, r: 6 } },
      { kind: "iceni_nobles", at: { q: 9, r: 4 } },
      { kind: "iceni_nobles", at: { q: 9, r: 5 } },
      { kind: "essedarii", at: { q: 10, r: 2 } },
      { kind: "essedarii", at: { q: 10, r: 7 } },
      { kind: "britons_slingers", at: { q: 10, r: 3 } },
      { kind: "britons_slingers", at: { q: 10, r: 6 } },
      { kind: "wagon_line", at: { q: 12, r: 4 } },
      { kind: "wagon_line", at: { q: 12, r: 5 } },
    ],
    objectives: [
      win("Break the host", 250, "Hold the line, break the units in front of you, and let the collapse do the rest. The wagons at the back do not have to be taken."),
      pilaFirst("Every cohort throws pila before it fights", 75),
      noCohortRouted("Bring every cohort home", 100),
      flankKills("Break 2 units while they are flanked", 2, 75),
    ],
    unlocksCodex: ["watling_street", "wagon_line", "poenius"],
  },
  {
    id: "sweep", campaignId: "britannia", order: 6,
    title: "The Winter Sweep", year: "61 to 62 AD", place: "Iceni and Trinovantian country",
    briefing: "The revolt is over and the punishment has begun. Paulinus is burning the territories of every people who rose and of some who only failed to help, in a country that has not sown a crop. The procurator Julius Classicianus is writing to Nero about it. There are armed bands still in the field. Break them, and stop there.",
    tactic: "When to stop",
    lesson: "This one is won by what you do not do. A unit routs at a quarter strength and leaves the field alive; every man killed past that is a man the province will remember. Break them and let them go. Restraint is the objective, and it is the only objective in this game you can fail by winning too hard.",
    width: W, height: H, maxTurns: 12, ai: "seasoned",
    terrain: terrain({
      marsh: [[6, 1], [7, 1], [6, 2], [9, 7], [10, 7], [9, 8]],
      forest: [[3, 0], [4, 0], [10, 0], [11, 0], [3, 9], [4, 9], [10, 9], [11, 9], [8, 3], [8, 6]],
      hill: [[11, 4], [11, 5], [12, 4]],
      rough: [[5, 4], [5, 5], [6, 8], [7, 2]],
    }),
    victory: {
      metric: "enemiesLeft", compare: "zero",
      text: "Clear the armed bands from the country.",
    },
    player: [
      { kind: "cohort", at: { q: 1, r: 3 }, label: "Coh. IX" },
      { kind: "cohort", at: { q: 1, r: 5 }, label: "Coh. X" },
      { kind: "aux_infantry", at: { q: 0, r: 4 }, label: "Coh. I Vangionum" },
      { kind: "ala_cavalry", at: { q: 0, r: 6 }, label: "Ala I Thracum" },
      { kind: "aux_archers", at: { q: 0, r: 2 }, label: "Coh. I Ituraeorum" },
    ],
    enemy: [
      { kind: "britons_warhost", at: { q: 11, r: 2 } },
      { kind: "britons_warhost", at: { q: 12, r: 6 } },
      { kind: "britons_slingers", at: { q: 13, r: 4 } },
      { kind: "essedarii", at: { q: 10, r: 5 } },
    ],
    objectives: [
      win("Clear the armed bands", 150, "Break every band still under arms. Routing one is enough; it does not have to be destroyed."),
      restraint("Kill fewer than 900 of them doing it", 900, 150),
      lossesUnder("Lose fewer than 300 men", 300, 50),
    ],
    unlocksCodex: ["classicianus", "aftermath"],
  },
];
