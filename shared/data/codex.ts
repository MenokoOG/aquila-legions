import type { CodexEntry } from "../types.js";

/** History codex. Unlocked by scenarios and objectives. Plain, checkable statements only. */
export const CODEX: CodexEntry[] = [
  {
    id: "legion_structure", title: "Anatomy of an Imperial Legion", era: "c. 100 AD",
    tags: ["organization"],
    body: [
      "Eight men shared a tent and a mule: the contubernium. Ten of those made a century of 80, led by a centurion and his deputy, the optio.",
      "Six centuries made a cohort of 480. Ten cohorts made a legion, though the First Cohort was double strength with five centuries of 160.",
      "With 120 horsemen for scouting and messages, a legion at full strength was roughly 5,200 men. It rarely was at full strength.",
      "Under Trajan there were about 30 legions. Each had a number and a name: Legio I Adiutrix, Legio XIII Gemina, Legio V Macedonica.",
    ],
  },
  {
    id: "pilum", title: "The Pilum", era: "Republic to 3rd century AD",
    tags: ["equipment", "tactic"],
    body: [
      "A heavy javelin about two metres long with a thin iron shank. Thrown at 15 to 30 metres, moments before the lines met.",
      "The soft iron bent on impact. A pilum stuck in a shield could not be pulled out or thrown back, and the shield had to be dropped.",
      "The volley was the opening of a Roman fight, not an afterthought. It broke the enemy's shield wall a heartbeat before the gladius went in.",
    ],
  },
  {
    id: "testudo", title: "Testudo", era: "Republic to Late Empire",
    tags: ["formation"],
    body: [
      "Front rank shields forward, ranks behind lift shields overhead, files on the edges face outward. The result is a roofed box.",
      "Cassius Dio describes a testudo so tight that men could walk on top of it, and horses could be ridden over it.",
      "It was for crossing arrow fire and approaching walls. It could barely see, barely move, and could not fight. Break it before contact.",
    ],
  },
  {
    id: "cuneus", title: "Cuneus: the Wedge", era: "Republic to Late Empire",
    tags: ["formation"],
    body: [
      "Vegetius calls it the caput porcinum, the pig's head. A narrowing front that concentrates the best men on a single point of the enemy line.",
      "Once the point is in, the men behind widen the gap and the enemy line splits in two. Each half can then be flanked.",
      "The wedge's weakness is its own sides. An enemy who holds instead of breaking can attack it from both flanks at once.",
    ],
  },
  {
    id: "orbis", title: "Orbis: the Circle", era: "Republic to Late Empire",
    tags: ["formation"],
    body: [
      "When a unit was cut off or facing horse on open ground it formed the orbis: a ring, every shield outward, wounded in the centre.",
      "Caesar's men formed it at the Sabis in 57 BC when the Nervii came through the trees on three sides.",
      "It buys time. Something else, cavalry or a relieving cohort, has to end the fight.",
    ],
  },
  {
    id: "trajan", title: "Trajan, Optimus Princeps", era: "98 to 117 AD",
    tags: ["people"],
    body: [
      "Marcus Ulpius Traianus, born in Italica in Hispania. The first emperor from the provinces, adopted by Nerva while commanding on the Rhine.",
      "Under him the empire reached its greatest extent: Dacia in 106, Arabia in 106, Armenia and Mesopotamia in 114 to 116.",
      "The Senate later wished each new emperor 'felicior Augusto, melior Traiano': luckier than Augustus, better than Trajan.",
    ],
  },
  {
    id: "dacian_wars", title: "The Dacian Wars", era: "101 to 106 AD",
    tags: ["campaign"],
    body: [
      "Decebalus, king of Dacia, had beaten Domitian's armies and extracted a subsidy from Rome. Trajan crossed the Danube in 101 to end it.",
      "The first war (101 to 102) was won at the Second Battle of Tapae and by a hard winter campaign; Decebalus accepted terms and broke them.",
      "The second war (105 to 106) ended with the fall of the capital, Sarmizegetusa Regia. Decebalus killed himself rather than be captured.",
      "Dacia's gold paid for Trajan's Forum, and the whole campaign is carved in a spiral on Trajan's Column in Rome.",
    ],
  },
  {
    id: "tapae", title: "Tapae, 101 AD", era: "First Dacian War",
    tags: ["battle"],
    body: [
      "The Iron Gates pass into the Dacian heartland. Domitian's general Tettius Julianus had fought there in 88; Trajan fought there in 101.",
      "Cassius Dio says Roman wounded were so many that Trajan tore up his own clothing for bandages and dedicated an altar to the fallen.",
      "It was a costly win against a prepared enemy in his own hills, not a parade. The pass was open, and the army wintered in Dacia.",
    ],
  },
  {
    id: "falx", title: "The Falx and the Helmet Brace", era: "1st to 2nd century AD",
    tags: ["equipment"],
    body: [
      "The Dacian falx was a curved two-handed blade, sharpened on the inside. Swung overhead it reached past the rim of a scutum.",
      "Roman helmets from the Dacian wars gain crossed iron reinforcing bars over the crown, and legionaries appear with a segmented arm guard, the manica.",
      "It is one of the clearest cases of Roman equipment changing in direct answer to a single enemy weapon.",
    ],
  },
  {
    id: "auxilia", title: "The Auxilia", era: "Augustus onward",
    tags: ["organization"],
    body: [
      "Roughly half the army was not legionary. Auxiliary cohorts and cavalry alae were raised from non-citizens: Gauls, Thracians, Syrians, Batavians.",
      "They supplied what the legions lacked: archers, slingers, and above all cavalry. On Trajan's Column they do most of the actual fighting.",
      "After 25 years an auxiliary received a bronze diploma granting citizenship to him and his children. Thousands survive.",
    ],
  },
  {
    id: "flanking", title: "Flanks, Reserves, and Cannae's Lesson", era: "216 BC onward",
    tags: ["tactic"],
    body: [
      "A formed body of infantry is strong to its front and weak everywhere else. Hannibal taught Rome this at Cannae by enveloping eight legions.",
      "Rome learned. The Imperial legion fought with its cohorts in staggered lines so that a reserve could always answer a flank.",
      "The cavalry's job was the enemy's flank, not his front. A cohort held; an ala finished.",
    ],
  },
  {
    id: "sarmizegetusa", title: "Sarmizegetusa Regia, 106 AD", era: "Second Dacian War",
    tags: ["battle"],
    body: [
      "The Dacian capital sat on a mountain terrace in the Orastie range, ringed by stone walls in the murus dacicus style.",
      "Trajan's army cut the water supply and stormed it. The Column shows Dacian nobles sharing poison as the walls fall.",
      "Decebalus fled, was run down by a Roman cavalry patrol, and cut his own throat. The decurion who reached him, Tiberius Claudius Maximus, put it on his tombstone.",
    ],
  },
  {
    id: "marching_camp", title: "The Marching Camp", era: "Republic to Late Empire",
    tags: ["organization"],
    body: [
      "Every night on campaign the army dug a ditch, threw up a rampart, and laid out streets in the same plan. Josephus says it went up 'as if a city.'",
      "The plan never changed, so a soldier could find his tent in the dark in any camp in the empire.",
      "Discipline, not the sword, was the legion's real weapon. The camp was that discipline made visible.",
    ],
  },
];

export const CODEX_BY_ID: Record<string, CodexEntry> = Object.fromEntries(
  CODEX.map((entry) => [entry.id, entry]),
);
