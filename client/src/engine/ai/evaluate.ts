import type { AiPolicy, Hex } from "../../../../shared/types.js";
import { FORMATIONS } from "../../../../shared/data/formations.js";
import { distance } from "../../hex.js";
import { type BattleState, type BattleUnit, terrainAt, unitsOf } from "../battle.js";
import { forecast } from "../forecast.js";

/**
 * What a blow or a piece of ground is worth, as one number the AI can sort on.
 *
 * Everything here is read through `forecast`, which is the same pure formula the
 * player's own forecast panel shows. The AI therefore cannot know something the
 * player cannot see, and it cannot be tuned by a rule the combat code disagrees
 * with. A testudo is a poor target because the missile multiplier says so, not
 * because a line here says archers dislike tortoises.
 */

/**
 * How much a blow's own damage counts. It has to be heavy enough that the
 * arithmetic decides between two similar targets, or the flat bonuses below
 * swamp it and the host starts shooting at tortoises.
 */
const DAMAGE_WEIGHT = 3;
/** Taking a unit off the board is worth about four full-strength blows. */
const BREAK_BONUS = 1.2;
/** Missile troops are soft and they are what whittles the host down. */
const SOFT_TARGET = 0.35;
/** A circle cannot be flanked and fights back hard. Grind on it last. */
const UNFLANKABLE = 0.4;
/** A legionary cohort is the unit the battle is actually about. */
const CORE_TARGET = 0.15;
/**
 * How much the host's chosen target outweighs a target of opportunity. A
 * tie-breaker on purpose: a unit with a plainly better blow in front of it
 * takes that one, and the host does not walk past a broken cohort to reach it.
 */
export const FOCUS_BONUS = 0.25;

/** Standing worth of a target, before any particular attacker is considered. */
export function targetPriority(t: BattleUnit): number {
  let v = 1 - t.men / t.maxMen;
  if (t.tmpl.range > 0) v += SOFT_TARGET;
  if (t.tmpl.core) v += CORE_TARGET;
  if (FORMATIONS[t.formation].ignoresFlanking) v -= UNFLANKABLE;
  return v;
}

function breakValue(breaks: "certain" | "possible" | "no"): number {
  return breaks === "certain" ? BREAK_BONUS : breaks === "possible" ? BREAK_BONUS * 0.5 : 0;
}

/** What charging `t` is worth to `a` from where `a` stands. */
export function meleeValue(s: BattleState, a: BattleUnit, t: BattleUnit, p: AiPolicy): number {
  const f = forecast(s, a, t, "melee");
  let v = DAMAGE_WEIGHT * (f.dealt.min + f.dealt.max) / 2 / t.maxMen;
  v += breakValue(f.breaks);
  v += targetPriority(t);
  if (p.weighTrades && f.taken) {
    v -= DAMAGE_WEIGHT * (f.taken.min + f.taken.max) / 2 / a.maxMen;
    // Losing our own unit costs about what breaking theirs was worth.
    if (f.risky) v -= BREAK_BONUS;
  }
  return v;
}

/** What shooting `t` is worth to `a` from where `a` stands. */
export function shotValue(s: BattleState, a: BattleUnit, t: BattleUnit): number {
  const f = forecast(s, a, t, "shoot");
  return DAMAGE_WEIGHT * (f.dealt.min + f.dealt.max) / 2 / t.maxMen
    + breakValue(f.breaks) + targetPriority(t);
}

/**
 * Runs `fn` as though the unit had already walked to `h`. Nothing else observes
 * the state in between, and the position is put back before returning, so this
 * stays a question asked of the rules rather than a move made in them.
 */
export function asIfAt<T>(u: BattleUnit, h: Hex, moved: number, fn: () => T): T {
  const at = u.at;
  const dist = u.movedDist;
  u.at = h;
  u.movedDist = moved;
  try {
    return fn();
  } finally {
    u.at = at;
    u.movedDist = dist;
  }
}

/** Terrain worth of a hex to a unit that is not attacking from it this turn. */
export function groundValue(s: BattleState, u: BattleUnit, h: Hex, p: AiPolicy): number {
  if (!p.useTerrain) return 0;
  const t = terrainAt(s, h);
  let v = t === "hill" ? 0.20 : t === "forest" ? 0.15 : 0;
  // Standing where the Roman bows and bolt-throwers reach costs more than the hill is worth.
  for (const e of unitsOf(s, "player")) {
    if (e.tmpl.range > 0 && distance(e.at, h) <= e.tmpl.range) v -= 0.12;
  }
  return v;
}
