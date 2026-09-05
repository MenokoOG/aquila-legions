import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { key } from "../client/src/hex.js";
import { threatAt, threatLevel, threatMap } from "../client/src/engine/threat.js";
import { moveUnit } from "../client/src/engine/rules.js";
import { at, field } from "./helpers.js";

/** The overlay is a promise to the player: if a hex is clean, nothing can reach it. */

describe("threat map", () => {
  it("marks every hex a warband can charge, not just the ones next to it", () => {
    // Move 4 on open plain, so the warband can close and still strike well beyond its hex.
    const s = field({ dacia: [{ kind: "warband", at: { q: 5, r: 4 } }] });
    const map = threatMap(s, "enemy");

    assert.equal(threatLevel(threatAt(map, { q: 4, r: 4 })), 1, "adjacent hex is threatened");
    assert.equal(threatLevel(threatAt(map, { q: 1, r: 4 })), 1, "four moves out, then a charge");
    assert.equal(threatLevel(threatAt(map, { q: 0, r: 0 })), 0, "the far corner is out of reach");
  });

  it("separates a charge from an arrow", () => {
    // Opposite corners, so neither unit's reach reaches into the other's.
    const s = field({
      dacia: [
        { kind: "warband", at: { q: 0, r: 0 } },
        { kind: "dacian_archers", at: { q: 9, r: 7 } },
      ],
    });
    const map = threatMap(s, "enemy");

    const nextToWarband = threatAt(map, { q: 1, r: 0 });
    assert.equal(nextToWarband?.melee.length, 1);
    assert.equal(nextToWarband?.missile.length, 0);

    // Move 4 plus range 3 reaches a long way, and the archers never close to melee.
    const underBow = threatAt(map, { q: 9, r: 4 });
    assert.equal(underBow?.missile.length, 1);
    assert.equal(underBow?.melee.length, 0);
  });

  it("counts every attacker bearing on one hex", () => {
    const s = field({
      dacia: [
        { kind: "warband", at: { q: 4, r: 3 } },
        { kind: "falxmen", at: { q: 6, r: 3 } },
      ],
    });
    const cell = threatAt(threatMap(s, "enemy"), { q: 5, r: 3 });
    assert.equal(cell?.melee.length, 2);
  });

  it("reports reach the enemy will have next turn, not what it has left this one", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 0, r: 0 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 4 } }],
    });
    const before = threatMap(s, "enemy").size;

    // The warband has charged and is finished for this turn. It is still the same threat
    // to plan against, because the overlay answers for the turn after this one.
    const warband = at(s, 5, 4);
    warband.moved = true;
    warband.acted = true;
    assert.equal(threatMap(s, "enemy").size, before, "a spent unit still threatens next turn");
    assert.ok(before > 0);
  });

  it("shrinks when a cohort plugs the lane the enemy would walk", () => {
    // A one-hex-wide corridor: forest walls above and below, so the only way west is r=4.
    const wall: Record<string, "forest"> = {};
    for (let q = 0; q < 10; q++) {
      wall[key({ q, r: 3 })] = "forest";
      wall[key({ q, r: 5 })] = "forest";
    }
    const s = field({
      terrain: wall,
      rome: [{ kind: "cohort", at: { q: 8, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 4, r: 4 } }],
    });
    const open = threatMap(s, "enemy").size;

    // Standing in the mouth of the corridor is the whole point of a shield wall.
    moveUnit(s, at(s, 8, 4), { q: 5, r: 4 });
    assert.ok(threatMap(s, "enemy").size < open, "blocking the lane cuts the enemy's reach");
  });

  it("goes quiet once the battle is decided", () => {
    const s = field({ dacia: [{ kind: "warband", at: { q: 5, r: 4 } }] });
    s.over = { won: true, reason: "done" };
    assert.equal(threatMap(s, "enemy").size, 0);
  });
});
