import type { Objective, Scenario } from "../types.js";
import { hexes, terrain } from "./board.js";

/**
 * The Jewish War, 67 to 73 AD.
 *
 * Dacia teaches the legion's tools and Britannia teaches ground. This campaign
 * teaches what the legion did to a place that would not come out and fight:
 * it built. Josephus, who commanded at Jotapata, was taken, and then watched
 * the rest of the war from the Roman side, describes ramps, a wall round a
 * whole city and a ramp up a rock, all of them engineering projects first and
 * battles second. Three of these five are therefore won by holding ground or
 * lasting, not by clearing the field.
 *
 * Tuning follows the other campaigns: the enemy level climbs gently, and the
 * bonuses are objectives the briefing itself describes.
 */

const win = (text: string, points: number): Objective => ({
  id: "win", text, metric: "enemiesLeft", compare: "victory", points,
  hint: "Rout or destroy every defender before the turn limit. A unit breaks once it falls under a quarter of its men.",
});

const survive = (text: string, turns: number, points: number): Objective => ({
  id: "survive", text, metric: "turnsSurvived", compare: "gte", value: turns, points,
  hint: "The work only has to be finished, not defended to the last man. Keep the line where it is, answer each sortie where it lands, and be standing when the turns run out.",
});

const holdGround = (text: string, count: number, points: number): Objective => ({
  id: "hold_ground", text, metric: "keyHexesHeld", compare: "gte", value: count, points,
  hint: "Stand on the marked hexes when the fighting stops. A unit that went off to chase a kill is not holding anything.",
});

const lossesUnder = (text: string, value: number, points: number): Objective => ({
  id: "losses_under", text, metric: "playerLosses", compare: "lt", value, points,
  hint: "Rotate a battered unit out of contact before it breaks, and do not buy a wall with men you will need for the next one.",
});

const missileLossesUnder = (text: string, value: number, points: number): Objective => ({
  id: "missile_losses_under", text, metric: "missileLosses", compare: "lt", value, points,
  hint: "Form testudo before you walk under the wall, and drop back to line once the archers are behind you or dead.",
});

const noCohortRouted = (text: string, points: number): Objective => ({
  id: "no_cohort_routed", text, metric: "cohortsRouted", compare: "zero", points,
  hint: "Pull a battered cohort out of contact before it drops under a quarter strength. Auxiliaries routing does not count against you.",
});

const flankKills = (text: string, value: number, points: number): Objective => ({
  id: "flank_kills", text, metric: "flankKills", compare: "gte", value, points,
  hint: "Get two units adjacent to the same enemy, then break it. A defender facing the breach has his back to the rest of your line.",
});

const pilaFirst = (text: string, points: number): Objective => ({
  id: "pila_before_melee", text, metric: "pilaSkipped", compare: "zero", outstanding: "cohortsYetToThrow", points,
  hint: "Throw pila at an adjacent enemy before that cohort ever swings a gladius. Over a breach, the volley goes in before the sword.",
});

const cuneusKills = (text: string, value: number, points: number): Objective => ({
  id: "cuneus_kills", text, metric: "cuneusKills", compare: "gte", value, points,
  hint: "Set a cohort to cuneus (wedge) and let that cohort land the blow that breaks the enemy unit.",
});

const W = 14;
const H = 10;

export const JUDAEA_SCENARIOS: Scenario[] = [
  {
    id: "jotapata", campaignId: "judaea", order: 1,
    title: "The Bank at Jotapata", year: "67 AD", place: "Jotapata, Galilee",
    briefing: "Vespasian has come to a fortress on a rock with ravines on three sides and a wall on the fourth. There is one way up. The defenders have the heights and the stone to throw from them. Bring the scorpiones forward, clear the wall, and take the ridge.",
    tactic: "Cover the climb with missiles",
    lesson: "Defenders on high ground take a fifth less from every blow. The way to take that away is not to charge it but to shoot it: park the Scorpiones behind your line and let them thin the wall before the cohorts climb. Form testudo for the last open stretch.",
    width: W, height: H, maxTurns: 16, ai: "raw",
    terrain: terrain({
      cliff: [[8, 0], [8, 1], [8, 8], [8, 9], [9, 0], [9, 9]],
      hill: [[9, 3], [9, 4], [9, 5], [9, 6], [10, 3], [10, 4], [10, 5], [10, 6], [11, 4], [11, 5]],
      rough: [[6, 4], [6, 5], [7, 3], [7, 6]],
      forest: [[2, 0], [3, 0], [2, 9], [3, 9]],
    }),
    player: [
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. II (V Macedonica)" },
      { kind: "cohort", at: { q: 3, r: 6 }, label: "Coh. III (V Macedonica)" },
      { kind: "cohort", at: { q: 2, r: 4 }, label: "Coh. IV (X Fretensis)" },
      { kind: "cohort", at: { q: 2, r: 5 }, label: "Coh. V (X Fretensis)" },
      { kind: "aux_archers", at: { q: 1, r: 5 }, label: "Syrian archers" },
      { kind: "scorpio", at: { q: 1, r: 4 }, label: "Scorpiones" },
    ],
    enemy: [
      { kind: "wall_archers", at: { q: 10, r: 5 } },
      { kind: "zealots", at: { q: 10, r: 3 } },
      { kind: "zealots", at: { q: 10, r: 6 } },
    ],
    objectives: [
      win("Take the heights", 100),
      missileLossesUnder("Lose fewer than 300 men to missiles", 300, 75),
      noCohortRouted("No legionary cohort routs", 50),
    ],
    unlocksCodex: ["jewish_war", "jotapata"],
  },
  {
    id: "gamla", campaignId: "judaea", order: 2,
    title: "The Camel's Back", year: "67 AD", place: "Gamla, the Golan",
    briefing: "The town is built on a ridge shaped like a camel's hump, with houses stacked up the slope so that each roof is the next man's street. The first assault goes in through the narrow lanes. Josephus says it did not end well. Do better: do not fight where they want you to.",
    tactic: "Do not fight in the lane",
    lesson: "The defenders sit where only a single unit can reach them at a time. Attack there and you take losses with nothing to show. Pull them out of the lane: take the open ground on the flank and let them come down into the space you have chosen.",
    width: W, height: H, maxTurns: 16, ai: "seasoned",
    terrain: terrain({
      cliff: [[7, 0], [7, 1], [7, 2], [7, 7], [7, 8], [7, 9], [8, 0], [8, 9]],
      hill: [[9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [10, 3], [10, 4], [10, 5], [10, 6], [11, 4], [11, 5]],
      rough: [[8, 4], [8, 5], [6, 3], [6, 6]],
      forest: [[2, 0], [2, 9], [3, 0], [3, 9]],
    }),
    player: [
      { kind: "first_cohort", at: { q: 3, r: 4 }, label: "Coh. I (XV Apollinaris)" },
      { kind: "cohort", at: { q: 3, r: 2 }, label: "Coh. II (XV Apollinaris)" },
      { kind: "cohort", at: { q: 3, r: 7 }, label: "Coh. III (XV Apollinaris)" },
      { kind: "aux_infantry", at: { q: 2, r: 5 }, label: "Coh. I Ubiorum" },
      { kind: "cohort", at: { q: 2, r: 4 }, label: "Coh. IV (XV Apollinaris)" },
      { kind: "ala_cavalry", at: { q: 1, r: 3 }, label: "Ala Gallorum" },
    ],
    enemy: [
      { kind: "zealots", at: { q: 9, r: 3 } },
      { kind: "zealots", at: { q: 9, r: 6 } },
      { kind: "sicarii", at: { q: 9, r: 4 } },
      { kind: "wall_archers", at: { q: 11, r: 4 } },
    ],
    objectives: [
      win("Clear the ridge", 125),
      lossesUnder("Lose fewer than 900 men", 900, 75),
      flankKills("Destroy 1 enemy unit while it is flanked", 1, 50),
    ],
    unlocksCodex: ["gamla"],
  },
  {
    id: "circumvallation", campaignId: "judaea", order: 3,
    title: "The Wall Round Jerusalem", year: "70 AD", place: "North of the city, before the First Wall",
    briefing: "Titus has decided to starve a city he could not storm easily. The work is a wall round the whole of Jerusalem, and Josephus says it was run up in three days. The men building it cannot also fight. Hold the line of the work until it is closed, and answer every sortie where it lands.",
    tactic: "Hold the line of the work",
    lesson: "You are not clearing the field; you are keeping a fixed line safe for a fixed time. Keep the marked ground occupied, put cohorts where a sortie would reach the work first, and keep the Scorpiones where they cover the gap. The turn counter, not the body count, is the win.",
    width: W, height: H, maxTurns: 7, ai: "seasoned",
    terrain: terrain({
      rough: [[5, 3], [5, 6], [9, 4], [9, 5]],
      hill: [[2, 1], [2, 8], [11, 2], [11, 7]],
      forest: [[6, 0], [7, 0], [6, 9], [7, 9]],
    }),
    keyHexes: hexes([[4, 4], [4, 5], [5, 4], [5, 5]]),
    victory: {
      metric: "turnsSurvived", compare: "gte", value: 6,
      text: "Hold the line of the work for six turns.",
    },
    player: [
      { kind: "cohort", at: { q: 4, r: 4 }, label: "Coh. II (XII Fulminata)" },
      { kind: "cohort", at: { q: 4, r: 5 }, label: "Coh. III (XII Fulminata)" },
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. IV (XV Apollinaris)" },
      { kind: "aux_infantry", at: { q: 3, r: 6 }, label: "Coh. II Ituraeorum" },
      { kind: "scorpio", at: { q: 2, r: 5 }, label: "Scorpiones" },
    ],
    enemy: [
      { kind: "sicarii", at: { q: 10, r: 3 } },
      { kind: "sicarii", at: { q: 10, r: 6 } },
      { kind: "zealots", at: { q: 12, r: 4 } },
    ],
    objectives: [
      survive("Hold the line for 6 turns", 6, 125),
      holdGround("Keep 3 hexes of the work occupied at the end", 3, 50),
      lossesUnder("Lose fewer than 900 men", 900, 50),
    ],
    unlocksCodex: ["circumvallation"],
  },
  {
    id: "antonia", campaignId: "judaea", order: 4,
    title: "The Antonia", year: "70 AD", place: "Jerusalem, the Temple Mount",
    briefing: "The Antonia fortress guards the Temple from the north and the only way to the Temple is through it. The ramps have been thrown up. The assault goes in at night, with the breach narrow. The temple garrison fight as men who think the building will not fall. Show them it can.",
    tactic: "Wedge the breach",
    lesson: "A breach is a doorway: only so many can go through at once, and the first man through is alone. Throw pila at the breach, put a cohort into cuneus and drive it through, then flank the survivors from the cohorts behind. Do it in that order.",
    width: W, height: H, maxTurns: 14, ai: "veteran",
    terrain: terrain({
      cliff: [[8, 0], [8, 1], [8, 2], [8, 3], [8, 6], [8, 7], [8, 8], [8, 9]],
      hill: [[9, 2], [9, 3], [9, 4], [9, 5], [9, 6], [9, 7], [10, 3], [10, 4], [10, 5], [10, 6], [11, 4], [11, 5]],
      rough: [[7, 4], [7, 5], [6, 4], [6, 5]],
    }),
    player: [
      { kind: "first_cohort", at: { q: 4, r: 4 }, label: "Coh. I (V Macedonica)" },
      { kind: "cohort", at: { q: 4, r: 5 }, label: "Coh. II (V Macedonica)" },
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. III (XII Fulminata)" },
      { kind: "cohort", at: { q: 3, r: 6 }, label: "Coh. IV (XII Fulminata)" },
      { kind: "aux_archers", at: { q: 2, r: 4 }, label: "Syrian archers" },
      { kind: "scorpio", at: { q: 1, r: 5 }, label: "Scorpiones" },
    ],
    enemy: [
      { kind: "temple_guard", at: { q: 9, r: 4 } },
      { kind: "temple_guard", at: { q: 9, r: 5 } },
      { kind: "zealots", at: { q: 10, r: 3 } },
      { kind: "wall_archers", at: { q: 11, r: 4 } },
    ],
    objectives: [
      win("Take the fortress", 150),
      pilaFirst("Every cohort throws its pila before it fights in melee", 75),
      cuneusKills("Destroy 1 enemy unit with a cohort in Cuneus", 1, 75),
      noCohortRouted("No legionary cohort routs", 50),
    ],
    unlocksCodex: ["antonia", "titus"],
  },
  {
    id: "masada", campaignId: "judaea", order: 5,
    title: "The Ramp at Masada", year: "73 AD", place: "Masada, above the Dead Sea",
    briefing: "The last holdout is a mesa with cliffs on every side and one way up, and Flavius Silva has taken the only approach the way Romans took everything else: he is building a ramp. Josephus says the ramp took months and the wall that closed the rock took less. Reach the summit and break the garrison on the casemate wall.",
    tactic: "A ramp is an argument",
    lesson: "The garrison has high ground and nowhere to go; you have time and numbers. Take the ramp up in testudo, keep the archers behind the front line, and set the ground you want at the top before you cross the last stretch. Once the first unit is flanked on the narrow top, the rest follow.",
    width: W, height: H, maxTurns: 18, ai: "seasoned",
    terrain: terrain({
      cliff: [
        [6, 0], [6, 1], [6, 2], [6, 3], [6, 6], [6, 7], [6, 8], [6, 9],
        [7, 0], [7, 9], [10, 0], [10, 9],
      ],
      hill: [[7, 4], [7, 5], [8, 3], [8, 4], [8, 5], [8, 6], [9, 3], [9, 4], [9, 5], [9, 6], [11, 4], [11, 5]],
      rough: [[5, 4], [5, 5]],
    }),
    player: [
      { kind: "first_cohort", at: { q: 3, r: 4 }, label: "Coh. I (X Fretensis)" },
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. II (X Fretensis)" },
      { kind: "cohort", at: { q: 3, r: 6 }, label: "Coh. III (X Fretensis)" },
      { kind: "cohort", at: { q: 2, r: 5 }, label: "Coh. IV (X Fretensis)" },
      { kind: "aux_infantry", at: { q: 2, r: 4 }, label: "Coh. I Hamiorum" },
      { kind: "aux_archers", at: { q: 1, r: 4 }, label: "Syrian archers" },
      { kind: "scorpio", at: { q: 1, r: 5 }, label: "Scorpiones" },
    ],
    enemy: [
      { kind: "sicarii", at: { q: 9, r: 3 } },
      { kind: "zealots", at: { q: 10, r: 4 } },
      { kind: "wall_archers", at: { q: 11, r: 4 } },
      { kind: "wall_archers", at: { q: 11, r: 5 } },
    ],
    objectives: [
      win("Take the wall", 150),
      flankKills("Destroy 1 enemy unit while it is flanked", 1, 75),
      missileLossesUnder("Lose fewer than 350 men to missiles on the ramp", 350, 75),
      lossesUnder("Lose fewer than 1000 men", 1000, 50),
    ],
    unlocksCodex: ["masada", "josephus"],
  },
];
