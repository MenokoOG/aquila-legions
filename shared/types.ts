/** Shared game model. Imported by both server and client. */

/**
 * Which army a unit belongs to. The engine deliberately does not know the word
 * "Rome" or the word "Dacia": a campaign supplies the names it shows the player,
 * so a second era is a data file rather than an edit to the rules.
 */
export type Side = "player" | "enemy";

/** Named mechanics, not named peoples. A campaign chooses which of these it teaches. */
export type Formation = "line" | "testudo" | "cuneus" | "orbis";

export type Terrain = "plain" | "forest" | "hill" | "rough";

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

export interface SaveState {
  version: 1;
  commander: string;
  historyPoints: number;
  rank: string;
  scenarios: Record<string, ScenarioRecord>;
  codexUnlocked: string[];
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
