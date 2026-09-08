/** Shared game model. Imported by both server and client. */

/**
 * Which army a unit belongs to. The engine deliberately does not know the word
 * "Rome" or the word "Dacia": a campaign supplies the names it shows the player,
 * so a second era is a data file rather than an edit to the rules.
 */
export type Side = "player" | "enemy";

/** Named mechanics, not named peoples. A campaign chooses which of these it teaches. */
export type Formation = "line" | "testudo" | "cuneus" | "orbis" | "march_column";

/** Ground. What each one costs and what it is worth is in `data/terrain.ts`. */
export type Terrain = "plain" | "forest" | "hill" | "rough" | "marsh" | "road" | "cliff";

/** How well the enemy fights. The table of what each level can do is in `data/ai-levels.ts`. */
export type AiLevel = "raw" | "seasoned" | "veteran";

/**
 * What an enemy host is capable of, as switches rather than as a difficulty
 * number. Every one of these is a thing the player can watch happen and learn
 * to expect, which a multiplier on the dice would not be.
 */
export interface AiPolicy {
  /** Shown in the briefing, so the player knows what they are walking into. */
  name: string;
  blurb: string;
  /**
   * Weigh every hex the unit could attack from, rather than closing by the
   * shortest route and swinging. This is where flanking, the charge and higher
   * ground come from: they are not rules the AI knows, they are what the combat
   * formulas say about one position over another.
   */
  weighPositions: boolean;
  /** Concentrate the host on one unit a turn instead of each man picking his own. */
  focusFire: boolean;
  /** Count the counter-attack, and refuse a trade that costs more than it wins. */
  weighTrades: boolean;
  /** Missile troops step out of contact before shooting rather than fighting at the bow. */
  kite: boolean;
  /** Wait for a neighbour rather than walking into a cohort alone. Bounded; see `ai/act.ts`. */
  holdForSupport: boolean;
  /** Prefer ground that fights well when there is nothing to attack. */
  useTerrain: boolean;
}

export interface Hex {
  q: number;
  r: number;
}

/** How one side of one campaign is spoken about on screen and in the battle log. */
export interface Faction {
  /** "Rome" — used where the army is the subject. */
  name: string;
  /** "Roman" — used to qualify a noun, as in "Roman losses". */
  adjective: string;
  /** "The Dacians" — used where the army acts, as in "The Dacians move." */
  plural: string;
}

export interface Campaign {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  blurb: string;
  player: Faction;
  enemy: Faction;
  /**
   * What this era calls an enemy fighting at a given level. The levels are
   * capabilities, and the same capability has a different name in a different
   * war: a host that comes straight on is a probe in Dacia and the whole of
   * Boudica's army in Britain. Anything left unset falls back to the level's
   * own wording.
   */
  hosts?: Partial<Record<AiLevel, { name: string; blurb: string }>>;
}

/**
 * What a formation does, as numbers rather than as branches in the combat code.
 * Every multiplier here was a literal inside rules.ts before; moving them out is
 * what lets a new campaign add a formation without touching the rules.
 */
export interface FormationDef {
  name: string;
  latin: string;
  /** One-line rules summary, shown on the order button's tooltip. */
  short: string;
  history: string;
  attackMul: number;
  defenseMul: number;
  /** Multiplier on incoming missile damage. Testudo is the reason this exists. */
  missileMul: number;
  /** Fixed move allowance, or null to use the unit's own. */
  moveOverride: number | null;
  ignoresFlanking: boolean;
  /** Whether pila can be thrown from this formation. */
  blocksPila: boolean;
}

/**
 * A unit's fixed characteristics. `UnitKind` is derived from the roster files
 * rather than written here, so adding a campaign's units cannot mean editing a
 * union in this file.
 */
export interface UnitTemplate {
  side: Side;
  name: string;
  latin: string;
  men: number;
  attack: number;
  defense: number;
  move: number;
  range: number;
  pila: number;
  canFormation: boolean;
  /**
   * A unit of the line, whose loss the campaign counts against you. Roman
   * legionary cohorts are core; auxiliaries are not.
   */
  core: boolean;
  /** Horsemen. Drives the charge bonus, the enemy AI's target choice, and the orbis lesson. */
  mounted: boolean;
  /** Melee multiplier once the unit has covered two hexes or more. 1 means no charge. */
  chargeBonus: number;
  /** Multiplier on the target's melee defense. Below 1 is a weapon that reaches past a shield. */
  armourPiercing: number;
  /**
   * Breaks when the unit beside it breaks. A host held together by nothing but
   * its own confidence: Boudica's warriors, not a legion. See the cascade in
   * `engine/rules.ts`.
   */
  brittle?: boolean;
  /** Three-letter board glyph, e.g. "COH". */
  glyph: string;
  /** How the log describes this unit shooting. Defaults to "shoots". */
  missileVerb?: string;
  blurb: string;
}

export interface UnitPlacement {
  kind: string;
  at: Hex;
  label?: string;
}

/**
 * The numbers a battle keeps about itself. An objective is a comparison against
 * one of these, which is why neither the engine nor the server holds a switch
 * over objective names any more.
 *
 * Like `Formation`, this is written out rather than derived: deriving it would
 * make this file depend on the engine, and that inversion is worse than one
 * line per new measurement.
 */
export type Metric =
  | "enemiesLeft"
  | "playerLosses"
  | "enemyLosses"
  | "missileLosses"
  | "cuneusKills"
  | "flankKills"
  | "cavalryKills"
  | "cohortsRouted"
  | "testudoTurnsUnderFire"
  | "orbisHeldTurns"
  | "cohortsYetToThrow"
  | "pilaVolleys"
  | "keyHexesHeld"
  | "unitsExtracted"
  | "turnsSurvived"
  | "pilaSkipped"
  | "turns";

/** Every metric a battle measured, whether or not an objective asks about it. */
export type MetricBag = Record<Metric, number>;

/**
 * How an objective reads its metric. `victory` is the one that is not a number:
 * clearing the field is the win condition itself, and every other objective is
 * scored only in a battle that was won.
 */
export type Compare = "victory" | "gte" | "lt" | "zero";

export interface Objective {
  /**
   * Stable, persisted in the save as proof this objective was met. Never reuse
   * an id for a different test, and never rename one that has shipped.
   */
  id: string;
  text: string;
  metric: Metric;
  compare: Compare;
  /** The number `gte` and `lt` compare against. Unused by `victory` and `zero`. */
  value?: number;
  points: number;
  /** Shown in the after-action review when the objective was missed. */
  hint: string;
  /**
   * Work still to do before a `zero` objective can be called met, as a metric
   * that counts down. Without one, staying clean is only settled when the
   * battle ends; with one, reaching zero settles it early. It is also what the
   * live readout counts, since a failure metric sitting at zero says nothing
   * about how far along you are.
   */
  outstanding?: Metric;
}

/**
 * How the battle is won. Clearing the field is only one answer, and the second
 * campaign is mostly about the others: holding a place, getting away, lasting
 * until dark. It is the same shape as an `Objective` so it is judged by the same
 * comparator, and a scenario that leaves it out means "clear the field".
 */
export interface VictoryCondition {
  metric: Metric;
  compare: Compare;
  value?: number;
  /** What the player is told they have to do. Shown in the briefing. */
  text: string;
}

export interface Scenario {
  id: string;
  campaignId: string;
  order: number;
  title: string;
  year: string;
  place: string;
  briefing: string;
  tactic: string;
  lesson: string;
  width: number;
  height: number;
  terrain: Record<string, Terrain>;
  player: UnitPlacement[];
  enemy: UnitPlacement[];
  objectives: Objective[];
  unlocksCodex: string[];
  maxTurns: number;
  /** How this one is won. Absent means clearing the field. */
  victory?: VictoryCondition;
  /** Ground that has to be held, for a victory or an objective that counts it. */
  keyHexes?: Hex[];
  /**
   * The formations the orders panel offers here, in order, on keys 1 upward.
   * Absent means the four a legion always has. A scenario that teaches the
   * marching column adds it rather than every battle carrying it.
   */
  formations?: Formation[];
  /** Hexes a player unit leaves the board from. Ending a move on one takes it off. */
  exits?: Hex[];
  /**
   * Where the player may put their line before the first turn. A scenario with
   * one opens in the deployment phase; without one, the placements below are
   * the line and the battle starts immediately.
   */
  deployment?: { zone: Hex[]; text: string };
  /**
   * How well the enemy fights here. Unset is the middle level. The campaign
   * escalates it, because a lesson you are still learning should not be
   * examined by the best opponent in the game.
   */
  ai?: AiLevel;
}

export interface CodexEntry {
  id: string;
  title: string;
  era: string;
  body: string[];
  tags: string[];
}

export interface BattleStats {
  won: boolean;
  metrics: MetricBag;
}

export interface BattleResult {
  scenarioId: string;
  stats: BattleStats;
}

export interface ScenarioRecord {
  completed: boolean;
  bestPoints: number;
  attempts: number;
  /** Objective ids, not names. See `Objective.id`. */
  objectivesMet: string[];
}

/**
 * One thing worth keeping, in the player's own notebook. Codex entries file
 * themselves here on unlock, knowledge triggers file themselves the moment they
 * fire, and a tip from the Praefectus files itself when the player pins it.
 */
export interface CommentariusEntry {
  /** The trigger, codex or tip id. Filing the same thing twice is a no-op. */
  id: string;
  source: "trigger" | "codex" | "tip";
  title: string;
  body: string;
  tags: string[];
  /** The battle it happened in, or "" for anything filed outside one. */
  scenarioId: string;
  at: string;
}

export interface SaveState {
  version: 2;
  commander: string;
  historyPoints: number;
  rank: string;
  scenarios: Record<string, ScenarioRecord>;
  codexUnlocked: string[];
  /** The notebook. Appended to, never rewritten; ordered oldest first. */
  commentarii: CommentariusEntry[];
  battles: number;
  updatedAt: string;
}

export interface ResultResponse {
  save: SaveState;
  pointsEarned: number;
  objectivesMet: string[];
  newCodex: CodexEntry[];
  rankUp: string | null;
}
