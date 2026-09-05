import { type BattleState, type BattleUnit } from "./battle.js";
import {
  type AttackKind, ROLL_MAX, ROLL_MIN, attackPower, damageToMen, wouldRout,
} from "./rules.js";

/**
 * What an attack is likely to do, before you commit to it. Built from the same
 * pure formulas the real blow uses, so the numbers on screen cannot drift from
 * the numbers in the fight.
 */

export interface Range {
  min: number;
  max: number;
}

export interface Forecast {
  kind: AttackKind;
  /** Men the target loses. */
  dealt: Range;
  /** Men you lose to the counter-attack. Null when there is no retaliation. */
  taken: Range | null;
  /** "certain" if the worst roll still breaks them, "possible" if the best roll does. */
  breaks: "certain" | "possible" | "no";
  /** True when the attacker itself could be broken by the counter-attack. */
  risky: boolean;
}

function band(s: BattleState, a: BattleUnit, t: BattleUnit, kind: AttackKind, missile: boolean): Range {
  const power = attackPower(s, a, t, kind);
  return {
    min: damageToMen(s, a, t, power * ROLL_MIN, missile),
    max: damageToMen(s, a, t, power * ROLL_MAX, missile),
  };
}

export function forecast(s: BattleState, a: BattleUnit, t: BattleUnit, kind: AttackKind): Forecast {
  const missile = kind !== "melee";
  const dealt = band(s, a, t, kind, missile);
  const breaks = wouldRout(t, dealt.min) ? "certain" : wouldRout(t, dealt.max) ? "possible" : "no";

  // Only melee draws a counter-attack, and only from a target still standing after it.
  // The counter is thrown by the survivors, so a heavier blow softens it: pair the
  // best roll for us with the weakest counter and the worst roll with the strongest.
  const hurt = (menLost: number): BattleUnit => ({ ...t, men: Math.max(0, t.men - menLost) });
  const taken = kind === "melee" && breaks !== "certain"
    ? {
      min: band(s, hurt(dealt.max), a, "retaliation", false).min,
      max: band(s, hurt(dealt.min), a, "retaliation", false).max,
    }
    : null;

  return { kind, dealt, taken, breaks, risky: taken !== null && wouldRout(a, taken.max) };
}

export function describeRange(r: Range): string {
  return r.min === r.max ? `${r.min}` : `${r.min}–${r.max}`;
}
