import type { Hex, Side } from "../../../shared/types.js";
import { distance, key, neighbors } from "../hex.js";
import type { BattleState, BattleUnit } from "./battle.js";
import { projectedReach } from "./rules.js";

/**
 * Where the enemy can strike next turn.
 *
 * This answers a question the player used to have to hold in their head: if I stand
 * here, who can reach me? It reports capability, not intent — every hex a unit could
 * hit once its turn comes round, not the one hex the AI will actually pick. A player
 * who plans against capability is never ambushed by the AI changing its mind.
 */

export interface ThreatCell {
  /** Units that could close to contact and charge this hex. */
  melee: BattleUnit[];
  /** Units that could put arrows or bolts on it without closing. */
  missile: BattleUnit[];
}

export type ThreatMap = Map<string, ThreatCell>;

function cell(map: ThreatMap, k: string): ThreatCell {
  let c = map.get(k);
  if (!c) {
    c = { melee: [], missile: [] };
    map.set(k, c);
  }
  return c;
}

/**
 * Every hex the unit could be standing on when it acts: wherever it can walk, plus
 * the hex it already holds, because standing still is always a legal order.
 */
function firingPositions(s: BattleState, u: BattleUnit): Hex[] {
  const out: Hex[] = [{ ...u.at }];
  for (const k of projectedReach(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    out.push({ q, r });
  }
  return out;
}

/**
 * Threatened hexes for one unit. Melee units threaten what they can stand next to;
 * missile units threaten everything inside their range from anywhere they can stand,
 * because moving does not spend the shot.
 */
function markUnit(s: BattleState, u: BattleUnit, map: ThreatMap): void {
  const { width, height } = s.scenario;
  const spots = firingPositions(s, u);

  if (u.tmpl.range > 0) {
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const hx = { q, r };
        if (spots.some((p) => distance(p, hx) <= u.tmpl.range)) cell(map, key(hx)).missile.push(u);
      }
    }
    return;
  }

  const seen = new Set<string>();
  for (const p of spots) {
    for (const n of neighbors(p, width, height)) {
      const k = key(n);
      if (seen.has(k)) continue;
      seen.add(k);
      cell(map, k).melee.push(u);
    }
  }
}

/**
 * Every hex `side` could attack on its next turn, given the board as it stands.
 * Recompute after each order: a cohort that plugs a gap shrinks the map immediately.
 */
export function threatMap(s: BattleState, side: Side): ThreatMap {
  const map: ThreatMap = new Map();
  if (s.over) return map;
  for (const u of s.units) {
    if (u.side !== side) continue;
    markUnit(s, u, map);
  }
  return map;
}

export function threatAt(map: ThreatMap, h: Hex): ThreatCell | null {
  return map.get(key(h)) ?? null;
}

/** How many enemy units bear on a hex. Drives how heavily the overlay shades it. */
export function threatLevel(c: ThreatCell | null): number {
  return c ? c.melee.length + c.missile.length : 0;
}
