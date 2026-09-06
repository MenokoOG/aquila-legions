import { type BattleState, type BattleUnit, unitsOf } from "../battle.js";
import { effectiveMove } from "../rules.js";
import { distance } from "../../hex.js";
import { meleeValue, shotValue } from "./evaluate.js";
import { type HostContext, actUnit } from "./act.js";
import type { AiPolicy } from "../../../../shared/types.js";
import { policyFor } from "../../../../shared/data/ai-levels.js";

/**
 * The enemy's turn.
 *
 * The host decides two things before anyone moves: who it is trying to break,
 * and whether it is already in contact. Everything after that is each unit
 * asking the combat rules what its options are worth. There is no table of
 * tactics here — flanking, the charge, higher ground and leaving a tortoise
 * alone all fall out of the same formulas the player's forecast panel shows.
 */

export type { HostContext };
export { actUnit } from "./act.js";

/**
 * The unit the host will try to break this turn: the one it can hurt most,
 * summed over every unit that can reach it. Convergence, weakness and softness
 * are all already inside that sum — three warbands that can each half-kill a
 * bowman beat one that can scratch a first cohort — so nothing here needs to
 * weigh them separately, and the host will not agree to concentrate on a
 * target it cannot actually hurt.
 *
 * It is a preference, not an order: `FOCUS_BONUS` in `evaluate.ts` is small
 * enough that a unit with a plainly better blow in front of it takes that one.
 */
export function chooseFocus(s: BattleState, p: AiPolicy): BattleUnit | null {
  if (!p.focusFire) return null;
  let best: BattleUnit | null = null;
  let bestScore = -Infinity;
  for (const t of unitsOf(s, "player")) {
    let weight = 0;
    for (const u of unitsOf(s, "enemy")) {
      const d = distance(u.at, t.at);
      if (u.tmpl.range > 0) {
        if (d <= u.tmpl.range + effectiveMove(u)) weight += shotValue(s, u, t);
      } else if (d <= effectiveMove(u) + 1) {
        weight += meleeValue(s, u, t, p);
      }
    }
    if (weight > bestScore) { bestScore = weight; best = t; }
  }
  return bestScore > 0 ? best : null;
}

/** True once any enemy unit already stands in contact with the legion. */
function inContact(s: BattleState): boolean {
  return unitsOf(s, "enemy").some((u) =>
    unitsOf(s, "player").some((t) => distance(u.at, t.at) <= 1));
}

/** Yields after each unit so the UI can animate between actions. */
export function* enemyTurn(s: BattleState): Generator<BattleUnit, void, void> {
  const policy = policyFor(s.scenario.ai);
  const ctx: HostContext = {
    policy,
    focus: chooseFocus(s, policy),
    engaged: inContact(s),
  };

  // Bows first, so the cohort the host means to break is already bleeding when
  // the warbands reach it; horsemen next, while there is still open ground to
  // charge across; the foot last, into whatever the other two have opened.
  const order = [...unitsOf(s, "enemy")].sort((a, b) => rank(a) - rank(b));
  for (const u of order) {
    if (!s.units.includes(u) || s.over) return;
    // The focus can be broken partway through the turn; the rest re-aim.
    if (ctx.focus && !s.units.includes(ctx.focus)) ctx.focus = chooseFocus(s, policy);
    actUnit(s, u, ctx);
    ctx.engaged = ctx.engaged || inContact(s);
    yield u;
  }
}

function rank(u: BattleUnit): number {
  return u.tmpl.range > 0 ? 0 : u.tmpl.mounted ? 1 : 2;
}
