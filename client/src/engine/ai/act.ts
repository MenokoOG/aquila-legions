import type { AiPolicy, Hex } from "../../../../shared/types.js";
import { distance, key, neighbors } from "../../hex.js";
import { type BattleState, type BattleUnit, unitAt, unitsOf } from "../battle.js";
import { effectiveMove, melee, moveUnit, reachable, shoot } from "../rules.js";
import { FOCUS_BONUS, asIfAt, groundValue, meleeValue, shotValue, targetPriority } from "./evaluate.js";

/** One enemy unit's turn: where to stand, and who to hit from there. */

export interface HostContext {
  policy: AiPolicy;
  /** The unit the host is trying to break this turn, if it has agreed on one. */
  focus: BattleUnit | null;
  /** True once any enemy already stands in contact. Once blood is drawn, nobody waits. */
  engaged: boolean;
}

interface Position {
  at: Hex;
  /** Hexes covered to get there, which is what earns a cavalry charge. */
  moved: number;
}

interface Plan extends Position {
  target: BattleUnit;
  value: number;
}

function here(u: BattleUnit): Position {
  return { at: u.at, moved: 0 };
}

/** Every hex the unit could act from, itself included. */
function positions(s: BattleState, u: BattleUnit): Position[] {
  const out: Position[] = [here(u)];
  for (const k of reachable(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    const at = { q, r };
    out.push({ at, moved: distance(u.at, at) });
  }
  return out;
}

function enemiesAdjacentTo(s: BattleState, h: Hex): BattleUnit[] {
  const { width, height } = s.scenario;
  return neighbors(h, width, height)
    .map((n) => unitAt(s, n))
    .filter((x): x is BattleUnit => !!x && x.side === "player");
}

/** The single step that gets closest to `goal`, which is all a raw warband looks for. */
function stepToward(s: BattleState, u: BattleUnit, goal: Hex, keepRange: number): Position | null {
  let best: Position | null = null;
  let bestScore = keepRange > 0
    ? Math.abs(distance(u.at, goal) - keepRange)
    : distance(u.at, goal);
  for (const k of reachable(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    const at = { q, r };
    const d = distance(at, goal);
    const score = keepRange > 0 ? Math.abs(d - keepRange) + (d < 2 ? 3 : 0) : d;
    if (score < bestScore) { bestScore = score; best = { at, moved: distance(u.at, at) }; }
  }
  return best;
}

/**
 * Somewhere else on the board worth walking toward when there is nothing in
 * reach. The nearest player unit, unless the host has agreed on a target.
 */
function marchGoal(s: BattleState, u: BattleUnit, ctx: HostContext): BattleUnit | null {
  if (ctx.focus) return ctx.focus;
  let best: BattleUnit | null = null;
  let bestScore = Infinity;
  for (const t of unitsOf(s, "player")) {
    // Horsemen would rather find a bowman than break themselves on a circle.
    const bias = u.tmpl.mounted ? -targetPriority(t) * 2 : 0;
    const score = distance(u.at, t.at) + bias;
    if (score < bestScore) { bestScore = score; best = t; }
  }
  return best;
}

/**
 * Whether anyone else can be on that target this turn or next. This is what
 * stops the host walking into a legion one warband at a time, and it is bounded
 * on purpose: the enemy wins a stalled battle, so holding back stops the moment
 * blood is drawn and stops for everyone at the halfway turn.
 */
function hasSupport(s: BattleState, u: BattleUnit, t: BattleUnit): boolean {
  for (const other of unitsOf(s, "enemy")) {
    if (other.id === u.id) continue;
    const d = distance(other.at, t.at);
    if (d <= 1) return true;
    if (other.tmpl.range > 0 ? d <= other.tmpl.range : d <= effectiveMove(other) + 1) return true;
  }
  return false;
}

function mayHold(s: BattleState, ctx: HostContext): boolean {
  return ctx.policy.holdForSupport && !ctx.engaged && s.turn * 2 <= s.scenario.maxTurns;
}

/** The best blow this unit could land, over every hex it could land it from. */
function bestMeleePlan(s: BattleState, u: BattleUnit, ctx: HostContext): Plan | null {
  const p = ctx.policy;
  const goal = marchGoal(s, u, ctx);
  const spots: Position[] = p.weighPositions
    ? positions(s, u)
    : [here(u), ...(goal ? [stepToward(s, u, goal.at, 0)].filter((x): x is Position => !!x) : [])];

  let best: Plan | null = null;
  for (const spot of spots) {
    for (const t of enemiesAdjacentTo(s, spot.at)) {
      const value = asIfAt(u, spot.at, spot.moved, () => meleeValue(s, u, t, p))
        + (ctx.focus?.id === t.id ? FOCUS_BONUS : 0)
        + groundValue(s, u, spot.at, p);
      if (!best || value > best.value) best = { ...spot, target: t, value };
    }
  }
  return best;
}

/** The best shot, over every hex it could shoot from. */
function bestShotPlan(s: BattleState, u: BattleUnit, ctx: HostContext): Plan | null {
  const p = ctx.policy;
  const spots = p.weighPositions || p.kite ? positions(s, u) : [here(u)];

  let best: Plan | null = null;
  for (const spot of spots) {
    const contact = p.kite && enemiesAdjacentTo(s, spot.at).length > 0;
    for (const t of unitsOf(s, "player")) {
      if (distance(spot.at, t.at) > u.tmpl.range) continue;
      const value = asIfAt(u, spot.at, spot.moved, () => shotValue(s, u, t))
        + (ctx.focus?.id === t.id ? FOCUS_BONUS : 0)
        + groundValue(s, u, spot.at, p)
        // Archers caught at the sword lose more than the shot is worth.
        - (contact ? 1.0 : 0);
      if (!best || value > best.value) best = { ...spot, target: t, value };
    }
  }
  return best;
}

/** Ground to wait on: close to the target, out of contact, and worth standing on. */
function holdingGround(s: BattleState, u: BattleUnit, goal: Hex, ctx: HostContext): Position | null {
  let best: Position | null = null;
  let bestScore = -Infinity;
  for (const spot of positions(s, u)) {
    if (enemiesAdjacentTo(s, spot.at).length > 0) continue;
    const score = -distance(spot.at, goal) + groundValue(s, u, spot.at, ctx.policy);
    if (score > bestScore) { bestScore = score; best = spot; }
  }
  return best;
}

function advance(s: BattleState, u: BattleUnit, ctx: HostContext, keepRange: number): void {
  const goal = marchGoal(s, u, ctx);
  if (!goal) return;
  if (mayHold(s, ctx) && !hasSupport(s, u, goal)) {
    const wait = holdingGround(s, u, goal.at, ctx);
    if (wait && !sameSpot(wait.at, u.at)) moveUnit(s, u, wait.at);
    return;
  }
  const step = ctx.policy.useTerrain && keepRange === 0
    ? bestApproach(s, u, goal.at, ctx)
    : stepToward(s, u, goal.at, keepRange);
  if (step) moveUnit(s, u, step.at);
}

function sameSpot(a: Hex, b: Hex): boolean {
  return key(a) === key(b);
}

/** Closing, but preferring ground that fights well when two hexes are equally close. */
function bestApproach(s: BattleState, u: BattleUnit, goal: Hex, ctx: HostContext): Position | null {
  let best: Position | null = null;
  let bestScore = -distance(u.at, goal);
  for (const spot of positions(s, u)) {
    const score = -distance(spot.at, goal) + groundValue(s, u, spot.at, ctx.policy);
    if (score > bestScore) { bestScore = score; best = spot; }
  }
  return best;
}

export function actUnit(s: BattleState, u: BattleUnit, ctx: HostContext): void {
  if (u.tmpl.range > 0) {
    const plan = bestShotPlan(s, u, ctx);
    if (plan) {
      if (!sameSpot(plan.at, u.at)) moveUnit(s, u, plan.at);
      if (distance(u.at, plan.target.at) <= u.tmpl.range) shoot(s, u, plan.target);
      return;
    }
    advance(s, u, ctx, u.tmpl.range);
    const after = bestShotPlan(s, u, ctx);
    if (after && sameSpot(after.at, u.at)) shoot(s, u, after.target);
    return;
  }

  const plan = bestMeleePlan(s, u, ctx);
  // A veteran host counts the counter-attack, and will not spend a warband for nothing.
  const worthIt = plan && (!ctx.policy.weighTrades || plan.value > 0);
  const alone = plan && !sameSpot(plan.at, u.at) && !hasSupport(s, u, plan.target);
  if (plan && worthIt && !(alone && mayHold(s, ctx))) {
    if (!sameSpot(plan.at, u.at)) moveUnit(s, u, plan.at);
    if (distance(u.at, plan.target.at) <= 1) melee(s, u, plan.target);
    return;
  }
  advance(s, u, ctx, 0);
}
