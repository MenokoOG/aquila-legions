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

export type ObjectiveKind =
  | "win"
  | "pila_before_melee"
  | "missile_losses_under"
  | "cuneus_kills"
  | "flank_kills"
  | "no_cohort_routed"
  | "testudo_under_fire"
  | "orbis_held"
  | "cavalry_kills";

export interface Objective {
  kind: ObjectiveKind;
  text: string;
  value?: number;
  points: number;
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
  turns: number;
  playerLosses: number;
  enemyLosses: number;
  pilaBeforeMelee: boolean;
  missileLosses: number;
  cuneusKills: number;
  flankKills: number;
  cavalryKills: number;
  cohortsRouted: number;
  testudoTurnsUnderFire: number;
  orbisHeldTurns: number;
}

export interface BattleResult {
  scenarioId: string;
  stats: BattleStats;
}

export interface ScenarioRecord {
  completed: boolean;
  bestPoints: number;
  attempts: number;
  objectivesMet: ObjectiveKind[];
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
  objectivesMet: ObjectiveKind[];
  newCodex: CodexEntry[];
  rankUp: string | null;
}
