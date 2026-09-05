import type { Scenario, Terrain } from "../types.js";

function terrain(spec: Partial<Record<Terrain, [number, number][]>>): Record<string, Terrain> {
  const out: Record<string, Terrain> = {};
  for (const [kind, cells] of Object.entries(spec) as [Terrain, [number, number][]][]) {
    for (const [q, r] of cells) out[`${q},${r}`] = kind;
  }
  return out;
}

const W = 14;
const H = 10;

/** Six scenarios, in campaign order. Each one exists to teach the tactic named in `tactic`. */
export const SCENARIOS: Scenario[] = [
  {
    id: "castra", order: 1, title: "The Marching Camp", year: "101 AD", place: "Danube crossing, Moesia",
    briefing: "The legion has crossed the Danube on a pontoon bridge and dug its first camp on Dacian soil. A warband is probing the picket line at dawn. Drive them off.",
    tactic: "Move, attack, end turn",
    lesson: "Select a cohort, move it next to an enemy, and attack. Watch the strength bar: a unit that falls under a quarter of its men routs. Kill or rout every enemy to win.",
    width: W, height: H, maxTurns: 12,
    terrain: terrain({ forest: [[9, 1], [10, 1], [9, 2]], hill: [[11, 7], [12, 7]], rough: [[6, 4], [6, 5]] }),
    rome: [
      { kind: "cohort", at: { q: 2, r: 3 }, label: "Coh. II" },
      { kind: "cohort", at: { q: 2, r: 5 }, label: "Coh. III" },
      { kind: "aux_infantry", at: { q: 1, r: 4 }, label: "Coh. I Batavorum" },
    ],
    dacia: [
      { kind: "warband", at: { q: 10, r: 3 } },
      { kind: "warband", at: { q: 11, r: 5 } },
    ],
    objectives: [
      { kind: "win", text: "Clear the field", points: 100 },
      { kind: "no_cohort_routed", text: "No legionary cohort routs", points: 50 },
    ],
    unlocksCodex: ["legion_structure", "marching_camp"],
  },
  {
    id: "pila", order: 2, title: "Pila First", year: "101 AD", place: "Foothills below the Iron Gates",
    briefing: "Three warbands are coming downhill at a run. The centurions are shouting the oldest order in the army: throw, then draw. Do not let a cohort go into the melee with its pila still on its shoulders.",
    tactic: "Pilum volley before contact",
    lesson: "Each cohort can throw pila once per battle at an adjacent enemy. It does heavy damage and takes no retaliation. Throw first, then attack with the gladius on the next turn or with another unit.",
    width: W, height: H, maxTurns: 12,
    terrain: terrain({ forest: [[12, 1], [13, 1], [12, 8]], hill: [[11, 3], [12, 3], [12, 4], [11, 6], [12, 6]], rough: [[7, 2], [7, 7]] }),
    rome: [
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. IV" },
      { kind: "cohort", at: { q: 3, r: 5 }, label: "Coh. V" },
      { kind: "cohort", at: { q: 2, r: 7 }, label: "Coh. VI" },
      { kind: "aux_archers", at: { q: 1, r: 5 }, label: "Coh. I Ituraeorum" },
    ],
    dacia: [
      { kind: "warband", at: { q: 9, r: 2 } },
      { kind: "warband", at: { q: 10, r: 5 } },
      { kind: "warband", at: { q: 9, r: 7 } },
    ],
    objectives: [
      { kind: "win", text: "Clear the field", points: 100 },
      { kind: "pila_before_melee", text: "Every cohort throws its pila before it fights in melee", points: 75 },
    ],
    unlocksCodex: ["pilum"],
  },
  {
    id: "testudo", order: 3, title: "Under the Arrows", year: "101 AD", place: "The Iron Gates pass",
    briefing: "Dacian archers hold the slopes on both sides of the pass and the column must go through. Lock shields. A cohort that walks into that fire in open order will not reach the far end.",
    tactic: "Testudo across a killing zone",
    lesson: "Put cohorts in Testudo while archers can reach them. It cuts missile damage by three quarters but slows you to one hex and blunts your attack. Drop back to Line the turn before you close.",
    width: W, height: H, maxTurns: 14,
    terrain: terrain({
      forest: [[5, 0], [6, 0], [7, 0], [5, 9], [6, 9], [7, 9]],
      hill: [[6, 1], [7, 1], [8, 1], [9, 1], [6, 8], [7, 8], [8, 8], [9, 8], [8, 2], [8, 7]],
      rough: [[4, 1], [4, 8], [10, 2], [10, 7]],
    }),
    rome: [
      { kind: "cohort", at: { q: 1, r: 3 }, label: "Coh. VII" },
      { kind: "cohort", at: { q: 1, r: 5 }, label: "Coh. VIII" },
      { kind: "cohort", at: { q: 1, r: 4 }, label: "Coh. IX" },
      { kind: "ala_cavalry", at: { q: 0, r: 6 }, label: "Ala I Thracum" },
    ],
    dacia: [
      { kind: "dacian_archers", at: { q: 7, r: 1 } },
      { kind: "dacian_archers", at: { q: 7, r: 8 } },
      { kind: "warband", at: { q: 11, r: 4 } },
      { kind: "warband", at: { q: 11, r: 5 } },
    ],
    objectives: [
      { kind: "win", text: "Clear the pass", points: 100 },
      { kind: "missile_losses_under", text: "Lose fewer than 150 men to arrows", value: 150, points: 75 },
      { kind: "testudo_under_fire", text: "Spend at least 3 cohort-turns in Testudo while under fire", value: 3, points: 50 },
    ],
    unlocksCodex: ["testudo", "auxilia"],
  },
  {
    id: "tapae", order: 4, title: "Tapae", year: "101 AD", place: "The Iron Gates, Second Battle of Tapae",
    briefing: "Decebalus has drawn his army up across the pass with the falxmen in the centre. The line will not be turned; it has to be broken. Form the wedge and drive it into one point.",
    tactic: "Cuneus to split a line",
    lesson: "Cuneus gives a cohort +40% attack at the cost of defense. Use it on the unit you intend to destroy, then flank the halves it leaves. Falxmen cut through part of your armour: hit them first, hard.",
    width: W, height: H, maxTurns: 14,
    terrain: terrain({
      forest: [[10, 0], [11, 0], [12, 0], [10, 9], [11, 9]],
      hill: [[12, 2], [13, 2], [12, 6], [13, 6], [13, 3], [13, 5]],
      rough: [[5, 1], [5, 8], [8, 4]],
    }),
    rome: [
      { kind: "first_cohort", at: { q: 2, r: 4 }, label: "Coh. I (Aquila)" },
      { kind: "cohort", at: { q: 2, r: 2 }, label: "Coh. II" },
      { kind: "cohort", at: { q: 2, r: 6 }, label: "Coh. III" },
      { kind: "aux_infantry", at: { q: 1, r: 1 }, label: "Coh. II Batavorum" },
      { kind: "aux_infantry", at: { q: 1, r: 7 }, label: "Coh. III Gallorum" },
      { kind: "scorpio", at: { q: 0, r: 4 }, label: "Scorpiones" },
    ],
    dacia: [
      { kind: "warband", at: { q: 10, r: 2 } },
      { kind: "falxmen", at: { q: 10, r: 4 } },
      { kind: "falxmen", at: { q: 10, r: 5 } },
      { kind: "warband", at: { q: 10, r: 7 } },
      { kind: "dacian_archers", at: { q: 12, r: 4 } },
    ],
    objectives: [
      { kind: "win", text: "Break the Dacian line", points: 150 },
      { kind: "cuneus_kills", text: "Destroy 2 enemy units with a cohort in Cuneus", value: 2, points: 75 },
      { kind: "flank_kills", text: "Destroy 1 enemy unit while it is flanked", value: 1, points: 50 },
    ],
    unlocksCodex: ["cuneus", "tapae", "falx"],
  },
  {
    id: "cataphracts", order: 5, title: "Horse in Scale", year: "102 AD", place: "The Wallachian plain",
    briefing: "The Roxolani have come across the frozen Danube to help Decebalus: armoured horsemen, lance and rider and horse all in scale. On open ground a loose cohort will be ridden down. Hold, then let the alae finish it.",
    tactic: "Orbis against cavalry, then counter with cavalry",
    lesson: "Cataphracts hit hardest after a long charge. A cohort in Orbis cannot be flanked and takes a third less damage. Absorb the charge in Orbis, then kill the stalled horsemen with your own alae and gladius.",
    width: W, height: H, maxTurns: 14,
    terrain: terrain({ forest: [[0, 0], [0, 9], [13, 9]], hill: [[3, 8]], rough: [[7, 0], [7, 9]] }),
    rome: [
      { kind: "cohort", at: { q: 3, r: 3 }, label: "Coh. IV" },
      { kind: "cohort", at: { q: 3, r: 5 }, label: "Coh. V" },
      { kind: "cohort", at: { q: 3, r: 7 }, label: "Coh. VI" },
      { kind: "ala_cavalry", at: { q: 1, r: 2 }, label: "Ala I Thracum" },
      { kind: "ala_cavalry", at: { q: 1, r: 8 }, label: "Ala II Gallorum" },
      { kind: "aux_archers", at: { q: 1, r: 5 }, label: "Coh. I Ituraeorum" },
    ],
    dacia: [
      { kind: "cataphracts", at: { q: 12, r: 2 } },
      { kind: "cataphracts", at: { q: 12, r: 5 } },
      { kind: "cataphracts", at: { q: 12, r: 8 } },
      { kind: "warband", at: { q: 13, r: 4 } },
    ],
    objectives: [
      { kind: "win", text: "Destroy the Roxolani", points: 150 },
      { kind: "no_cohort_routed", text: "No legionary cohort routs", points: 75 },
      { kind: "cavalry_kills", text: "Destroy 2 enemy units with your alae", value: 2, points: 50 },
      { kind: "orbis_held", text: "Hold Orbis for 2 cohort-turns while adjacent to cataphracts", value: 2, points: 50 },
    ],
    unlocksCodex: ["orbis", "flanking"],
  },
  {
    id: "sarmizegetusa", order: 6, title: "Sarmizegetusa Regia", year: "106 AD", place: "The Orastie mountains",
    briefing: "The water is cut and the walls are breached. Everything Decebalus has left is on the terraces below the citadel: warbands, falxmen, archers on the heights, and the last of the Roxolani. Use everything you have learned.",
    tactic: "Combined arms",
    lesson: "Pila before contact. Testudo under the archers. Cuneus on the falxmen. Orbis if the horse comes. Alae on the flank. There is no single trick; there is the whole legion.",
    width: W, height: H, maxTurns: 18,
    terrain: terrain({
      forest: [[0, 0], [1, 0], [0, 9], [1, 9], [6, 0], [6, 9]],
      hill: [[10, 1], [11, 1], [10, 8], [11, 8], [12, 3], [12, 4], [12, 5], [12, 6], [13, 4], [13, 5]],
      rough: [[8, 2], [8, 7], [9, 4], [9, 5]],
    }),
    rome: [
      { kind: "first_cohort", at: { q: 2, r: 4 }, label: "Coh. I (Aquila)" },
      { kind: "cohort", at: { q: 2, r: 2 }, label: "Coh. II" },
      { kind: "cohort", at: { q: 2, r: 6 }, label: "Coh. III" },
      { kind: "cohort", at: { q: 1, r: 3 }, label: "Coh. IV" },
      { kind: "cohort", at: { q: 1, r: 5 }, label: "Coh. V" },
      { kind: "aux_infantry", at: { q: 1, r: 1 }, label: "Coh. II Batavorum" },
      { kind: "aux_archers", at: { q: 0, r: 4 }, label: "Coh. I Ituraeorum" },
      { kind: "ala_cavalry", at: { q: 0, r: 7 }, label: "Ala I Thracum" },
      { kind: "ala_cavalry", at: { q: 0, r: 1 }, label: "Ala II Gallorum" },
      { kind: "scorpio", at: { q: 0, r: 5 }, label: "Scorpiones" },
    ],
    dacia: [
      { kind: "dacian_archers", at: { q: 10, r: 1 } },
      { kind: "dacian_archers", at: { q: 10, r: 8 } },
      { kind: "warband", at: { q: 10, r: 3 } },
      { kind: "falxmen", at: { q: 11, r: 4 } },
      { kind: "falxmen", at: { q: 11, r: 5 } },
      { kind: "warband", at: { q: 10, r: 6 } },
      { kind: "cataphracts", at: { q: 13, r: 2 } },
      { kind: "cataphracts", at: { q: 13, r: 7 } },
      { kind: "warband", at: { q: 13, r: 4 } },
    ],
    objectives: [
      { kind: "win", text: "Take the terraces", points: 250 },
      { kind: "pila_before_melee", text: "Every cohort throws pila before melee", points: 50 },
      { kind: "no_cohort_routed", text: "Bring every cohort home", points: 100 },
      { kind: "flank_kills", text: "Destroy 2 units while flanked", value: 2, points: 50 },
    ],
    unlocksCodex: ["sarmizegetusa", "dacian_wars", "trajan"],
  },
];

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
);
