import type { Objective, Scenario, Terrain, UnitPlacement } from "../shared/types.js";
import { type BattleState, type BattleUnit, createBattle } from "../client/src/engine/battle.js";
import { setRoll } from "../client/src/engine/rules.js";

/** Small fixtures so each test can state only the part of the board it cares about. */

/** The objective every fixture carries unless it says otherwise. */
export const WIN: Objective = {
  id: "win", text: "Clear the field", metric: "enemiesLeft", compare: "victory", points: 100,
  hint: "Rout or destroy every enemy unit before the turn limit.",
};

/**
 * Fixtures still name the two armies of the first campaign, because that is what
 * these tests are about. The engine underneath deals in player and enemy.
 */
export interface FieldSpec {
  rome?: UnitPlacement[];
  dacia?: UnitPlacement[];
  terrain?: Record<string, Terrain>;
  maxTurns?: number;
  objectives?: Scenario["objectives"];
}

export function scenario(spec: FieldSpec = {}): Scenario {
  return {
    id: "test", campaignId: "dacia", order: 1, title: "Test Field", year: "101 AD", place: "Nowhere",
    briefing: "", tactic: "", lesson: "",
    width: 10, height: 8, maxTurns: spec.maxTurns ?? 10,
    terrain: spec.terrain ?? {},
    player: spec.rome ?? [],
    enemy: spec.dacia ?? [],
    objectives: spec.objectives ?? [WIN],
    unlocksCodex: [],
  };
}

export function field(spec: FieldSpec = {}): BattleState {
  return createBattle(scenario(spec));
}

export function at(s: BattleState, q: number, r: number): BattleUnit {
  const u = s.units.find((x) => x.at.q === q && x.at.r === r);
  if (!u) throw new Error(`no unit at ${q},${r}`);
  return u;
}

/** Pins the luck roll so a test asserts on rules, not on dice. */
export function fixRoll(value = 1): void {
  setRoll(() => value);
}
