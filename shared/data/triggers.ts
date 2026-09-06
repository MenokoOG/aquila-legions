import type { Compare, Metric } from "../types.js";

/**
 * Notes that file themselves the first time you do the thing they are about.
 *
 * The Codex unlocks at the end of a battle, which is the wrong moment for a
 * fact about a tactic you just used for the first time. These fire the instant
 * it happens, while the board still shows what the sentence is describing, and
 * the note goes into the Commentarii to be read again later.
 *
 * A trigger is a comparison against a battle metric, judged by the same
 * comparator objectives use. Nothing here is a rule; it is all data, and a
 * campaign adds notes rather than code.
 *
 * Every claim is checkable in Cassius Dio, Vegetius, Josephus, Tacitus,
 * Ammianus, or on Trajan's Column, per the accuracy rule this game is held to.
 */

export interface KnowledgeTrigger {
  id: string;
  /** Fires when this metric compares true. */
  metric: Metric;
  compare: Compare;
  value?: number;
  title: string;
  note: string;
  tags: string[];
}

export const TRIGGERS: KnowledgeTrigger[] = [
  {
    id: "first_pila",
    metric: "pilaVolleys", compare: "gte", value: 1,
    title: "The volley before the sword",
    note: "Caesar describes the legion at Pharsalus running, halting to throw, then closing with drawn swords — the pilum was thrown at a few dozen paces, not skirmished with. Vegetius says the same drill was still being taught centuries later. A shield with a pilum through it had to be dropped, which is most of what the weapon was for.",
    tags: ["pilum", "drill"],
  },
  {
    id: "first_testudo",
    metric: "testudoTurnsUnderFire", compare: "gte", value: 1,
    title: "Shields over the heads",
    note: "Cassius Dio has Antony's men form the tortoise against Parthian archery, and says the Parthians took it for exhaustion and rode in, which was the point. Josephus watched legionaries cross open ground to the walls of Jerusalem under it. It is a way of arriving, not a way of fighting.",
    tags: ["testudo", "sieges"],
  },
  {
    id: "first_wedge",
    metric: "cuneusKills", compare: "gte", value: 1,
    title: "The pig's head",
    note: "Ammianus Marcellinus calls the wedge caput porcinum, the pig's head, and says the soldiers gave it the name themselves. It concentrates the whole weight of a unit on one point of the enemy line, and it leaves both of its own flanks in the air the moment it is through.",
    tags: ["cuneus", "formations"],
  },
  {
    id: "first_flank",
    metric: "flankKills", compare: "gte", value: 1,
    title: "Taken in the flank",
    note: "A shield is carried on one arm and covers one side. Ancient battle lines lost not because the front rank was killed but because the men behind it saw an enemy where nobody should be. Every Roman manual is about keeping a formed line and breaking the enemy's.",
    tags: ["flanking", "morale"],
  },
  {
    id: "first_cavalry",
    metric: "cavalryKills", compare: "gte", value: 1,
    title: "The wings",
    note: "The legions were infantry. The horse were auxilia — Gauls, Thracians, Batavians — organised in alae, the word for a wing, because that is where they stood. Trajan's Column shows them in mail, with the long spatha rather than the gladius, which is a sword for reaching down from a horse.",
    tags: ["cavalry", "auxilia"],
  },
  {
    id: "first_orbis",
    metric: "orbisHeldTurns", compare: "gte", value: 1,
    title: "Every man facing out",
    note: "The circle is what a unit forms when it has stopped trying to win. Caesar's men form it in Gaul when they are cut off; Tacitus has it in Germany. It holds against horsemen because a horse will not run onto a spear line it cannot see the end of, and it holds against nothing indefinitely.",
    tags: ["orbis", "cavalry"],
  },
  {
    id: "first_cohort_lost",
    metric: "cohortsRouted", compare: "gte", value: 1,
    title: "A cohort gone",
    note: "A cohort was about 480 men with their centurions, their standard and their records. Rome could raise another and did, but the number stayed in the army list: Varus lost three legions in the Teutoburg and their numbers — XVII, XVIII, XIX — were never used again.",
    tags: ["losses", "legion"],
  },
  {
    id: "heavy_losses",
    metric: "playerLosses", compare: "gte", value: 800,
    title: "What the wars cost",
    note: "Cassius Dio says Trajan's own account of the Dacian Wars recorded losses so heavy that the army ran out of bandages and the emperor cut up his own clothing for them, and afterwards ordered statues raised to the men who had died. The Column shows the fighting; the sentence in Dio is what it cost.",
    tags: ["dacian_wars", "losses"],
  },
];

export const TRIGGER_BY_ID: Record<string, KnowledgeTrigger> = Object.fromEntries(
  TRIGGERS.map((t) => [t.id, t]),
);
