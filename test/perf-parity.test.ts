import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Hex, Terrain } from "../shared/types.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import {
  type BattleState, type BattleUnit, createBattle, terrainAt, unitAt, unitsOf,
} from "../client/src/engine/battle.js";
import { effectiveMove, moveCost, pathTo, reachable } from "../client/src/engine/rules.js";
import { threatMap } from "../client/src/engine/threat.js";
import { HEX_SIZE, boardPixelSize, fromPixel, key, neighbors, toPixel } from "../client/src/hex.js";

/**
 * Reference oracles for the speed work.
 *
 * Each function below is the implementation as it stood before any of it was made
 * faster, kept here deliberately. A faster version is only allowed to be faster:
 * these tests fail the moment it starts giving a different answer. Delete them
 * only when the thing they guard is itself deleted.
 */

/** The original nearest-centre scan over every hex on the board. */
function fromPixelBrute(px: number, py: number, width: number, height: number, size = HEX_SIZE): Hex | null {
  let best: Hex | null = null;
  let bestD = Infinity;
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const p = toPixel({ q, r }, size);
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) { bestD = d; best = { q, r }; }
    }
  }
  return best && bestD <= (size * 0.95) ** 2 ? best : null;
}

/** The original Dijkstra: a re-sorted frontier and a linear scan for occupants. */
function searchBrute(s: BattleState, u: BattleUnit, fresh = false): Map<string, number> {
  const budget = effectiveMove(u);
  const cost = new Map<string, number>();
  if ((!fresh && (u.moved || u.acted)) || budget === 0) return cost;
  const best = new Map<string, number>([[key(u.at), 0]]);
  const frontier: { h: Hex; cost: number }[] = [{ h: u.at, cost: 0 }];
  const { width, height } = s.scenario;
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    for (const n of neighbors(cur.h, width, height)) {
      const occupant = unitAt(s, n);
      if (occupant && occupant.side !== u.side) continue;
      const c = cur.cost + moveCost(terrainAt(s, n) as Terrain);
      if (c > budget) continue;
      const k = key(n);
      if ((best.get(k) ?? Infinity) <= c) continue;
      best.set(k, c);
      frontier.push({ h: n, cost: c });
      if (!occupant) cost.set(k, c);
    }
  }
  return cost;
}

function sortedEntries(m: Map<string, number>): [string, number][] {
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

describe("hex picking still lands on the same hex", () => {
  it("round-trips every hex centre on every board", () => {
    for (const sc of SCENARIOS) {
      for (let r = 0; r < sc.height; r++) {
        for (let q = 0; q < sc.width; q++) {
          const p = toPixel({ q, r });
          const back = fromPixel(p.x, p.y, sc.width, sc.height);
          assert.deepEqual(back, { q, r }, `${sc.id} centre ${q},${r}`);
        }
      }
    }
  });

  it("agrees with the brute-force scan across the whole drawn area", () => {
    const sc = SCENARIOS[5]!;
    const { w, h } = boardPixelSize(sc.width, sc.height);
    // A fixed lattice rather than random points, so a failure is reproducible.
    for (let y = 0; y < h; y += 3) {
      for (let x = 0; x < w; x += 3) {
        const fast = fromPixel(x, y, sc.width, sc.height);
        const slow = fromPixelBrute(x, y, sc.width, sc.height);
        assert.deepEqual(fast, slow, `disagreed at ${x},${y}`);
      }
    }
  });

  it("still refuses points that fall outside any hex", () => {
    const sc = SCENARIOS[0]!;
    const { w, h } = boardPixelSize(sc.width, sc.height);
    assert.equal(fromPixel(-50, -50, sc.width, sc.height), null);
    assert.equal(fromPixel(w + 200, h + 200, sc.width, sc.height), null);
  });
});

describe("movement still reaches the same hexes at the same cost", () => {
  it("matches the original Dijkstra for every unit on every scenario", () => {
    for (const sc of SCENARIOS) {
      const s = createBattle(sc);
      for (const u of s.units) {
        assert.deepEqual(
          sortedEntries(reachable(s, u)),
          sortedEntries(searchBrute(s, u)),
          `${sc.id} / ${u.label}`,
        );
      }
    }
  });

  it("matches after units have moved and the board has changed shape", () => {
    const s = createBattle(SCENARIOS[5]!);
    // Spend some units so blocked lanes and spent orders are both in play.
    for (const u of unitsOf(s, "player").slice(0, 3)) u.moved = true;
    for (const u of s.units) {
      assert.deepEqual(sortedEntries(reachable(s, u)), sortedEntries(searchBrute(s, u)), u.label);
    }
  });

  it("returns a path that is walkable, ends where asked, and costs what reachable said", () => {
    const s = createBattle(SCENARIOS[0]!);
    const u = unitsOf(s, "player")[0]!;
    const r = reachable(s, u);
    for (const k of r.keys()) {
      const [q, rr] = k.split(",").map(Number) as [number, number];
      const path = pathTo(s, u, { q, r: rr });
      assert.ok(path.length > 0, `no path to ${k}`);
      assert.deepEqual(path[path.length - 1], { q, r: rr }, `path to ${k} ends elsewhere`);
      // Every step is adjacent to the one before it, starting from the unit.
      let prev = u.at;
      for (const step of path) {
        assert.ok(
          neighbors(prev, s.scenario.width, s.scenario.height).some((n) => n.q === step.q && n.r === step.r),
          `path to ${k} jumps from ${key(prev)} to ${key(step)}`,
        );
        prev = step;
      }
    }
  });
});

describe("the threat overlay still shades the same hexes", () => {
  /** Rebuilt from the map so a change in ordering inside a cell cannot fail the test. */
  function shape(s: BattleState): Map<string, { melee: string[]; missile: string[] }> {
    const out = new Map<string, { melee: string[]; missile: string[] }>();
    for (const [k, cell] of threatMap(s, "enemy")) {
      out.set(k, {
        melee: cell.melee.map((u) => u.id).sort(),
        missile: cell.missile.map((u) => u.id).sort(),
      });
    }
    return out;
  }

  it("marks a hex for a unit exactly once, never twice", () => {
    for (const sc of SCENARIOS) {
      const s = createBattle(sc);
      for (const [k, cell] of threatMap(s, "enemy")) {
        assert.equal(new Set(cell.melee.map((u) => u.id)).size, cell.melee.length, `${sc.id} ${k} melee`);
        assert.equal(new Set(cell.missile.map((u) => u.id)).size, cell.missile.length, `${sc.id} ${k} missile`);
      }
    }
  });

  it("never marks a hex outside the board", () => {
    for (const sc of SCENARIOS) {
      const s = createBattle(sc);
      for (const k of threatMap(s, "enemy").keys()) {
        const [q, r] = k.split(",").map(Number) as [number, number];
        assert.ok(q >= 0 && q < sc.width && r >= 0 && r < sc.height, `${sc.id} marked ${k}`);
      }
    }
  });

  it("shades a missile hex only where a shooter could actually stand and reach", () => {
    const s = createBattle(SCENARIOS[2]!);
    for (const [k, cell] of threatMap(s, "enemy")) {
      const [q, r] = k.split(",").map(Number) as [number, number];
      for (const shooter of cell.missile) {
        // Standing still is always legal, so its own hex plus its reach are the spots.
        const spots: Hex[] = [shooter.at, ...[...reachable(s, { ...shooter, moved: false, acted: false }).keys()]
          .map((sk) => {
            const [sq, sr] = sk.split(",").map(Number) as [number, number];
            return { q: sq, r: sr };
          })];
        assert.ok(
          spots.some((p) => Math.max(
            Math.abs((p.q - (p.r - (p.r & 1)) / 2) - (q - (r - (r & 1)) / 2)),
            Math.abs(p.r - r),
            Math.abs((-(p.q - (p.r - (p.r & 1)) / 2) - p.r) - (-(q - (r - (r & 1)) / 2) - r)),
          ) <= shooter.tmpl.range),
          `${shooter.label} cannot actually reach ${k}`,
        );
      }
    }
  });

  it("is unchanged by running it twice on the same board", () => {
    const s = createBattle(SCENARIOS[5]!);
    assert.deepEqual([...shape(s).entries()].sort(), [...shape(s).entries()].sort());
  });
});
