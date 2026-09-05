import type { Hex } from "../../../shared/types.js";
import { distance } from "../hex.js";
import { type BattleState, type BattleUnit, unitsOf } from "./battle.js";
import { isFlanked, melee, meleeTargets, moveUnit, rangedTargets, reachable, shoot } from "./rules.js";

/** The enemy side. Simple, readable, and a little aggressive, like the real thing. */

function nearestPlayerUnit(s: BattleState, from: Hex, prefer?: (u: BattleUnit) => number): BattleUnit | null {
  let best: BattleUnit | null = null;
  let bestScore = Infinity;
  for (const r of unitsOf(s, "player")) {
    const score = distance(from, r.at) + (prefer ? prefer(r) : 0);
    if (score < bestScore) { bestScore = score; best = r; }
  }
  return best;
}

function pickMelee(s: BattleState, u: BattleUnit): BattleUnit | null {
  const targets = meleeTargets(s, u);
  if (!targets.length) return null;
  const score = (t: BattleUnit) => {
    let v = t.men / t.maxMen;
    if (isFlanked(s, t)) v -= 0.4;
    if (t.formation === "orbis") v += 0.5;
    if (t.formation === "cuneus") v -= 0.2;
    if (t.tmpl.range > 0) v -= 0.3;
    return v;
  };
  return [...targets].sort((a, b) => score(a) - score(b))[0] ?? null;
}

function pickRanged(s: BattleState, u: BattleUnit): BattleUnit | null {
  const targets = rangedTargets(s, u);
  if (!targets.length) return null;
  return [...targets].sort((a, b) => {
    const pa = (a.formation === "testudo" ? 2 : 0) + a.men / a.maxMen;
    const pb = (b.formation === "testudo" ? 2 : 0) + b.men / b.maxMen;
    return pa - pb;
  })[0] ?? null;
}

function stepToward(s: BattleState, u: BattleUnit, goal: Hex, keepRange: number): void {
  const opts = reachable(s, u);
  if (!opts.size) return;
  let best: Hex | null = null;
  let bestScore = Infinity;
  for (const k of opts.keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    const h = { q, r };
    const d = distance(h, goal);
    const score = keepRange > 0 ? Math.abs(d - keepRange) + (d < 2 ? 3 : 0) : d;
    if (score < bestScore) { bestScore = score; best = h; }
  }
  const current = keepRange > 0 ? Math.abs(distance(u.at, goal) - keepRange) : distance(u.at, goal);
  if (best && bestScore < current) moveUnit(s, u, best);
}

export function actUnit(s: BattleState, u: BattleUnit): void {
  if (u.tmpl.range > 0) {
    const shot = pickRanged(s, u);
    if (shot) { shoot(s, u, shot); return; }
    const near = nearestPlayerUnit(s, u.at);
    if (near) stepToward(s, u, near.at, u.tmpl.range);
    const after = pickRanged(s, u);
    if (after) shoot(s, u, after);
    return;
  }

  const immediate = pickMelee(s, u);
  if (immediate) { melee(s, u, immediate); return; }

  // Horsemen would rather find a soft flank or a bowman than break themselves on a circle.
  const prefer = u.tmpl.mounted
    ? (r: BattleUnit) => (r.formation === "orbis" ? 4 : 0) + (r.tmpl.range > 0 ? -2 : 0)
    : undefined;
  const target = nearestPlayerUnit(s, u.at, prefer);
  if (!target) return;
  stepToward(s, u, target.at, 0);
  const now = pickMelee(s, u);
  if (now) melee(s, u, now);
}

/** Yields after each unit so the UI can animate between actions. */
export function* enemyTurn(s: BattleState): Generator<BattleUnit, void, void> {
  const order = [...unitsOf(s, "enemy")].sort((a, b) => {
    const pa = a.tmpl.range > 0 ? 0 : a.tmpl.mounted ? 1 : 2;
    const pb = b.tmpl.range > 0 ? 0 : b.tmpl.mounted ? 1 : 2;
    return pa - pb;
  });
  for (const u of order) {
    if (!s.units.includes(u) || s.over) return;
    actUnit(s, u);
    yield u;
  }
}
