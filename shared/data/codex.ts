import type { CodexEntry } from "../types.js";
import { SCENARIOS } from "./scenarios.js";

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
  {
    id: "boudica", title: "Boudica", era: "60 to 61 AD",
    tags: ["britannia", "revolt"],
    body: [
      "Widow of Prasutagus, client king of the Iceni. He left his kingdom jointly to his daughters and to Nero, expecting that to protect it. Tacitus says the estate was plundered, Boudica flogged and her daughters raped, and the Iceni nobles stripped of their lands.",
      "The Trinovantes joined her, and Tacitus gives their reason plainly: the veterans settled at Camulodunum had driven them off their land and treated them as slaves, and the temple of the deified Claudius stood there as, in his phrase, a citadel of eternal domination.",
      "Cassius Dio adds a physical description written a century and a half later, and it should be read as what it is. Tacitus, writing closer and with a father-in-law who served in Britain, gives her a speech and no portrait.",
      "Her end is not known. Tacitus says she took poison. Dio says she fell sick and died and was given a rich burial. No grave has been found, and every site claimed for one is a guess.",
    ],
  },
  {
    id: "camulodunum", title: "The Colonia at Camulodunum", era: "49 to 60 AD",
    tags: ["britannia", "archaeology"],
    body: [
      "Founded on the site of a legionary fortress as a settlement for time-served soldiers. It had a theatre, a senate house and the temple of Claudius, and no wall: a colonia of veterans was supposed to need none.",
      "Tacitus says the defenders held the temple for two days before it fell, and that no more than 200 regular soldiers ever reached them.",
      "Under modern Colchester there is a burn layer, in places half a metre thick, of fired daub and melted glass. The same layer is under London and under St Albans. It is the one part of the account that can be dug up.",
    ],
  },
  {
    id: "ninth_hispana", title: "The Ninth on the Road", era: "60 AD",
    tags: ["britannia", "legion"],
    body: [
      "Quintus Petillius Cerialis brought part of Legio IX Hispana south to relieve Camulodunum and was ambushed on the march. Tacitus says the whole of the infantry was killed and Cerialis escaped with his cavalry to his camp.",
      "The army's answer to being caught in column was the agmen quadratum, the marching square, which kept the baggage inside and the line ready to face outward. It costs speed, which is why it is not always used.",
      "The legion was not destroyed. It was reinforced from Germany and appears in Britain for decades afterwards. It leaves the record in the second century, and the popular story that it vanished in Caledonia rests on that gap rather than on evidence: tiles stamped by the Ninth have been found at Nijmegen.",
    ],
  },
  {
    id: "roman_roads", title: "Watling Street", era: "1st century AD onward",
    tags: ["britannia", "engineering"],
    body: [
      "A made road on an agger, a raised bank, cambered so water ran off, with ditches either side and metalling of rammed stone. It carried the army from the Channel through London to Wroxeter.",
      "A road is how an army arrives in time and how it is caught strung out. Those are the same fact.",
      "The battle that ended the revolt is placed on Watling Street by tradition and by the logic of the campaign. Tacitus names no site, and none has been found.",
    ],
  },
  {
    id: "londinium", title: "Londinium Given Up", era: "61 AD",
    tags: ["britannia", "command"],
    body: [
      "Paulinus reached London ahead of his army, judged that he could not hold it with what he had, and marched out. Tacitus says he was unmoved by the weeping of those who begged him to stay, and gave the signal to move.",
      "Those who could keep up went with the column. Tacitus says the ones who stayed, held by the place or by their age or by their sex, were destroyed by the enemy.",
      "It is the decision the whole campaign turns on. An army kept in being can fight later, and a garrison spent on a town that cannot be held is spent for nothing. It is also the sentence in Tacitus that costs the most to read.",
    ],
  },
  {
    id: "verulamium", title: "The Third Town", era: "61 AD",
    tags: ["britannia", "archaeology"],
    body: [
      "Verulamium, modern St Albans, was a municipium: a British town with Roman status, not a colony of settlers. It was burned like the others.",
      "Tacitus gives 70,000 citizens and allies killed across the three towns. That is a figure from a source, not a count, and archaeology can confirm the burning without confirming the number.",
      "He also notes that the Britons took no prisoners and made no exchanges, which he presents as the mark of a rising rather than of a war.",
    ],
  },
  {
    id: "defile", title: "Choosing the Ground", era: "61 AD",
    tags: ["britannia", "tactic"],
    body: [
      "Tacitus, Annals XIV.34: Paulinus chose a position in a defile with a wood behind him, having made sure there were no enemies except in front and that the plain there was open, with no fear of ambush.",
      "The reasoning is arithmetic. A host can only fight along the frontage it can present. Narrow the frontage and the extra numbers stand behind the fighting doing nothing, and cannot get round the ends.",
      "It is the same idea as Thermopylae, and as the wood-lined field at Agincourt. It is not a Roman invention; it is a Roman habit, and the manuals treat choosing ground as a commander's first duty.",
    ],
  },
  {
    id: "paulinus", title: "Gaius Suetonius Paulinus", era: "c. 41 to 69 AD",
    tags: ["britannia", "command"],
    body: [
      "A mountain-war specialist who had campaigned in the Atlas before Britain. When the revolt broke out he was on Anglesey, at the far end of the province, destroying the sacred groves of the druids.",
      "Tacitus rates him a soldier of the first rank and is not warm about him. He was recalled after the revolt, when the procurator reported that the punishment was preventing the province from settling.",
      "He reappears in 69 AD commanding for Otho at the first battle of Bedriacum, where his advice was overruled.",
    ],
  },
  {
    id: "watling_street", title: "The Last Battle", era: "61 AD",
    tags: ["britannia", "battle"],
    body: [
      "Tacitus gives Paulinus almost 10,000 men: Legio XIV Gemina, detachments of the Twentieth, and the nearest auxiliaries. He gives the British no number he will stand behind, and reports the Roman claim of 80,000 British dead against 400 Roman.",
      "That ratio is a victor's figure and should be read as one. The shape of the battle it describes, a narrow Roman front holding and then advancing in wedges, is consistent with everything else known about how the legion fought.",
      "The Second Legion never came. Its acting commander, Poenius Postumus, refused the order to march.",
    ],
  },
  {
    id: "wagon_line", title: "The Wagons", era: "61 AD",
    tags: ["britannia", "morale"],
    body: [
      "The families had come to watch and had drawn their wagons up in a line across the back of the field, in Tacitus's phrase at the very edge of the plain.",
      "It is an act of confidence, and it is what turned a defeat into a massacre: a host that broke had its own wagon line behind it and nowhere to go. Tacitus says the draught animals in the traces added to the heap of bodies.",
      "Ancient battles were rarely decided by killing. They were decided by one side deciding to leave. Take away the leaving and the killing is all that is left.",
    ],
  },
  {
    id: "poenius", title: "Poenius Postumus", era: "61 AD",
    tags: ["britannia", "command"],
    body: [
      "Praefectus castrorum of Legio II Augusta, and its acting commander. He was ordered to bring the legion to join Paulinus, and did not.",
      "Tacitus records in a single sentence that when he heard how well the other legions had done, he ran himself through with his sword, because he had cheated his own legion of a share in the glory.",
      "It is the only thing history knows about him.",
    ],
  },
  {
    id: "classicianus", title: "Julius Classicianus", era: "61 AD onward",
    tags: ["britannia", "government"],
    body: [
      "The procurator sent to Britain after the revolt, answerable for taxes and imperial property and not to the governor. Tacitus says he was on bad terms with Paulinus and let it be known that the province would find no end to its troubles while Paulinus commanded.",
      "He wrote to Nero. An imperial freedman was sent to look, and Paulinus was relieved of the province not long after, on a pretext.",
      "His tombstone was found in two pieces, reused in a bastion of London's Roman wall, and is in the British Museum. It was set up by his wife Julia Pacata, daughter of Julius Indus, a Gaulish noble. It is the only monument any of these people left that can still be read.",
    ],
  },
  {
    id: "aftermath", title: "When to Stop", era: "61 to 62 AD",
    tags: ["britannia", "government"],
    body: [
      "Paulinus spent the winter burning the territories of the peoples who had risen, and of those who had merely wavered. Tacitus says famine did more harm than the fighting, because they had not sown, having counted on taking Roman supplies.",
      "The complaint that reached Nero was not a moral one. It was fiscal and practical: a wrecked province pays no tax and needs a garrison, and a people with nothing left to lose has nothing to lose.",
      "His successor, Petronius Turpilianus, did very little, and Tacitus records the result with a sneer that reads oddly now. He called it honourable peace under a nicer name.",
    ],
  },
];

export const CODEX_BY_ID: Record<string, CodexEntry> = Object.fromEntries(
  CODEX.map((entry) => [entry.id, entry]),
);

/**
 * Which era each entry belongs to, taken from the battle that unlocks it.
 *
 * Derived rather than written on the entry, because the answer is already in
 * the scenario data and two places to state it is one place to get it wrong.
 * An entry no battle unlocks is unreachable, and `test/codex.test.ts` says so.
 */
export const CODEX_CAMPAIGN: Record<string, string> = Object.fromEntries(
  SCENARIOS.flatMap((s) => s.unlocksCodex.map((id) => [id, s.campaignId])),
);

/** The entries of one era, in the order its battles unlock them. */
export function codexOf(campaignId: string): CodexEntry[] {
  const order = SCENARIOS
    .filter((s) => s.campaignId === campaignId)
    .sort((a, b) => a.order - b.order)
    .flatMap((s) => s.unlocksCodex);
  return order.map((id) => CODEX_BY_ID[id]).filter((e): e is CodexEntry => !!e);
}
