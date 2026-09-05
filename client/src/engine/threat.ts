import type { Hex, Side } from "../../../shared/types.js";
import { hexAt, indexOf, key, neighborTable } from "../hex.js";
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
function firingPositions(s: BattleState, u: BattleUnit): number[] {
  const width = s.scenario.width;
  const out: number[] = [indexOf(u.at, width)];
  for (const k of projectedReach(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    out.push(r * width + q);
  }
  return out;
}

/**
 * Threatened hexes for one unit. Melee units threaten what they can stand next to;
 * missile units threaten everything inside their range from anywhere they can stand,
 * because moving does not spend the shot.
 *
 * Both are a sweep outward from the firing positions rather than a test of every hex
 * on the board against every position. `marked` carries over between units as a
 * stamp, so no hex is ever credited to the same unit twice.
 */
function markUnit(s: BattleState, u: BattleUnit, map: ThreatMap, marked: Int32Array, stamp: number): void {
  const { width, height } = s.scenario;
  const table = neighborTable(width, height);
  const spots = firingPositions(s, u);

  if (u.tmpl.range > 0) {
    // Multi-source sweep to `range` steps. One step of the neighbour table is one
    // hex of distance, so this reaches exactly the hexes within range of some spot.
    let frontier = spots.slice();
    for (const i of frontier) marked[i] = stamp;
    const reached = frontier.slice();
    for (let step = 0; step < u.tmpl.range; step++) {
      const next: number[] = [];
      for (const cur of frontier) {
        const base = cur * 6;
        for (let n = 0; n < 6; n++) {
          const nb = table[base + n]!;
          if (nb < 0 || marked[nb] === stamp) continue;
          marked[nb] = stamp;
          next.push(nb);
          reached.push(nb);
        }
      }
      if (!next.length) break;
      frontier = next;
    }
    for (const i of reached) cell(map, key(hexAt(i, width))).missile.push(u);
    return;
  }

  const touched: number[] = [];
  for (const spot of spots) {
    const base = spot * 6;
    for (let n = 0; n < 6; n++) {
      const nb = table[base + n]!;
      if (nb < 0 || marked[nb] === stamp) continue;
      marked[nb] = stamp;
      touched.push(nb);
    }
  }
  for (const i of touched) cell(map, key(hexAt(i, width))).melee.push(u);
}

/**
 * Every hex `side` could attack on its next turn, given the board as it stands.
 * Recompute after each order: a cohort that plugs a gap shrinks the map immediately.
 */
export function threatMap(s: BattleState, side: Side): ThreatMap {
  const map: ThreatMap = new Map();
  if (s.over) return map;
  const marked = new Int32Array(s.scenario.width * s.scenario.height);
  let stamp = 0;
  for (const u of s.units) {
    if (u.side !== side) continue;
    stamp += 1;
    markUnit(s, u, map, marked, stamp);
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
