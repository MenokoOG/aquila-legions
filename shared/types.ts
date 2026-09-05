/** Shared game model. Imported by both server and client. */

export type Side = "rome" | "dacia";

export type UnitKind =
  | "cohort"
  | "first_cohort"
  | "aux_infantry"
  | "aux_archers"
  | "ala_cavalry"
  | "scorpio"
  | "warband"
  | "falxmen"
  | "dacian_archers"
  | "cataphracts";

export type Formation = "line" | "testudo" | "cuneus" | "orbis";

export type Terrain = "plain" | "forest" | "hill" | "rough";

export interface Hex {
  q: number;
  r: number;
}

export interface UnitTemplate {
  kind: UnitKind;
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
  blurb: string;
}

export interface UnitPlacement {
  kind: UnitKind;
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
  rome: UnitPlacement[];
  dacia: UnitPlacement[];
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
  romanLosses: number;
  dacianLosses: number;
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
