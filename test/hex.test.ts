import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { boardPixelSize, distance, fromPixel, key, neighbors, same, toPixel } from "../client/src/hex.js";

describe("hex geometry", () => {
  it("measures a hex as zero from itself", () => {
    strictEqual(distance({ q: 4, r: 3 }, { q: 4, r: 3 }), 0);
  });

  it("measures every neighbour as one away", () => {
    const centre = { q: 4, r: 3 };
    for (const n of neighbors(centre, 10, 8)) strictEqual(distance(centre, n), 1);
  });

  it("gives an interior hex six neighbours and a corner fewer", () => {
    strictEqual(neighbors({ q: 4, r: 3 }, 10, 8).length, 6);
    strictEqual(neighbors({ q: 0, r: 0 }, 10, 8).length, 2, "odd-r offset leaves the top-left corner with two");
  });

  it("keeps neighbours inside the board", () => {
    for (const n of neighbors({ q: 9, r: 7 }, 10, 8)) {
      ok(n.q >= 0 && n.q < 10 && n.r >= 0 && n.r < 8, `${key(n)} is off the board`);
    }
  });

  it("is symmetric", () => {
    strictEqual(distance({ q: 1, r: 1 }, { q: 7, r: 5 }), distance({ q: 7, r: 5 }, { q: 1, r: 1 }));
  });

  it("rounds a hex centre back to that hex", () => {
    for (let r = 0; r < 8; r++) {
      for (let q = 0; q < 10; q++) {
        const p = toPixel({ q, r });
        deepStrictEqual(fromPixel(p.x, p.y, 10, 8), { q, r });
      }
    }
  });

  it("returns nothing for a click far off the board", () => {
    strictEqual(fromPixel(-500, -500, 10, 8), null);
  });

  it("sizes the canvas to hold every hex", () => {
    const { w, h } = boardPixelSize(10, 8);
    const last = toPixel({ q: 9, r: 7 });
    ok(last.x < w && last.y < h);
  });

  it("compares hexes by value", () => {
    ok(same({ q: 2, r: 2 }, { q: 2, r: 2 }));
    ok(!same({ q: 2, r: 2 }, { q: 2, r: 3 }));
  });
});
