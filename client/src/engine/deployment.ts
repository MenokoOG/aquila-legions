import type { Hex } from "../../../shared/types.js";
import { isBlocked } from "../../../shared/data/terrain.js";
import { key, same } from "../hex.js";
import { type BattleState, type BattleUnit, terrainAt, unitAt, unitsOf } from "./battle.js";

/**
 * Choosing where to stand, before anyone moves.
 *
 * Paulinus won Watling Street by picking his ground, and a game about that has
 * to let the player pick theirs. Deployment is deliberately not an order: it
 * costs no move points, it can be redone as often as you like, and nothing the
 * enemy does happens until you say the line is set.
 */

/** The hexes this scenario lets the player deploy onto, in a stable order. */
export function zone(s: BattleState): Hex[] {
  const spec = s.scenario.deployment;
  if (!spec) return [];
  return [...spec.zone]
    .filter((h) => !isBlocked(terrainAt(s, h)))
    .sort((a, b) => a.r - b.r || a.q - b.q);
}

export function inZone(s: BattleState, h: Hex): boolean {
  return zone(s).some((z) => same(z, h));
}

/** Whether this unit may stand here: inside the zone, on ground, and unoccupied. */
export function canPlace(s: BattleState, u: BattleUnit, h: Hex): boolean {
  if (s.phase !== "deploy" || u.side !== "player") return false;
  if (!inZone(s, h)) return false;
  const sitting = unitAt(s, h);
  return !sitting || sitting.id === u.id;
}

export function place(s: BattleState, u: BattleUnit, h: Hex): boolean {
  if (!canPlace(s, u, h)) return false;
  u.at = { ...h };
  return true;
}

/**
 * Steps a unit to the next free hex in the zone, which is how deployment is
 * driven from the keyboard. The zone order is stable, so the same key twice
 * walks the same way twice.
 */
export function stepPlacement(s: BattleState, u: BattleUnit, dir: 1 | -1): boolean {
  const cells = zone(s);
  if (!cells.length) return false;
  const taken = new Set(unitsOf(s, "player").filter((x) => x.id !== u.id).map((x) => key(x.at)));
  const from = cells.findIndex((h) => same(h, u.at));
  for (let step = 1; step <= cells.length; step++) {
    const next = cells[(((from + dir * step) % cells.length) + cells.length) % cells.length]!;
    if (!taken.has(key(next))) return place(s, u, next);
  }
  return false;
}

/**
 * Every player unit is on a zone hex. A scenario that opens in deployment puts
 * them there to begin with, so this only fails if something moved one out.
 */
export function isDeployed(s: BattleState): boolean {
  return unitsOf(s, "player").every((u) => inZone(s, u.at));
}

/** Ends deployment. From here the battle runs as any other. */
export function commitDeployment(s: BattleState): boolean {
  if (s.phase !== "deploy" || !isDeployed(s)) return false;
  s.phase = "battle";
  return true;
}
