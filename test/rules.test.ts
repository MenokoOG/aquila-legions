import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { key } from "../client/src/hex.js";
import { unitsOf } from "../client/src/engine/battle.js";
import {
  adjacentEnemies, checkOver, effectiveMove, endTurn, isFlanked, melee, moveUnit, pathTo,
  pilaTargets, rangedTargets, reachable, setFormation, shoot, throwPila,
} from "../client/src/engine/rules.js";
import { at, field, fixRoll } from "./helpers.js";

beforeEach(() => fixRoll(1));

describe("movement", () => {
  it("costs one point on plain and two on anything else", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 1, r: 3 } }],
      terrain: { "2,3": "forest", "3,3": "forest" },
    });
    const r = reachable(s, at(s, 1, 3));
    strictEqual(r.get("2,3"), 2, "one forest hex costs two");
    strictEqual(r.has("3,3"), false, "two forest hexes is four, past a move of three");
  });

  it("holds a testudo to one hex and roots an orbis in place", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 1, r: 3 } }] });
    const u = at(s, 1, 3);
    strictEqual(effectiveMove(u), 3);
    setFormation(s, u, "testudo");
    strictEqual(effectiveMove(u), 1);
    strictEqual(reachable(s, u).size, 6, "one hex in every direction, and no further");
    setFormation(s, u, "orbis");
    strictEqual(effectiveMove(u), 0);
    strictEqual(reachable(s, u).size, 0);
  });

  it("lets a unit cross a friend but never stop on one, and never cross an enemy", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 1, r: 3 } }, { kind: "cohort", at: { q: 2, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 1, r: 4 } }],
    });
    const r = reachable(s, at(s, 1, 3));
    strictEqual(r.has("2,3"), false, "cannot end on a friend");
    ok(r.has("3,3"), "but can pass through one");
    strictEqual(r.has("1,4"), false, "cannot end on an enemy");
  });

  it("returns a walkable path that ends where it was asked to", () => {
    const s = field({ rome: [{ kind: "ala_cavalry", at: { q: 1, r: 3 } }] });
    const path = pathTo(s, at(s, 1, 3), { q: 4, r: 3 });
    ok(path.length > 0);
    strictEqual(key(path[path.length - 1]!), "4,3");
  });

  it("has no path to a hex out of reach", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 1, r: 3 } }] });
    strictEqual(pathTo(s, at(s, 1, 3), { q: 9, r: 7 }).length, 0);
  });

  it("refuses a move it did not offer, and spends the unit on one it did", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 1, r: 3 } }] });
    const u = at(s, 1, 3);
    strictEqual(moveUnit(s, u, { q: 9, r: 7 }), false);
    strictEqual(u.moved, false);
    strictEqual(moveUnit(s, u, { q: 3, r: 3 }), true);
    strictEqual(u.moved, true);
    strictEqual(reachable(s, u).size, 0, "a unit that has moved cannot move again");
  });
});

describe("formations", () => {
  it("cannot be changed once the unit has moved", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 1, r: 3 } }] });
    const u = at(s, 1, 3);
    moveUnit(s, u, { q: 2, r: 3 });
    strictEqual(setFormation(s, u, "testudo"), false);
    strictEqual(u.formation, "line");
  });

  it("is only offered to units drilled for it", () => {
    const s = field({ rome: [{ kind: "aux_infantry", at: { q: 1, r: 3 } }] });
    strictEqual(setFormation(s, at(s, 1, 3), "testudo"), false);
  });
});

describe("flanking", () => {
  it("needs two adjacent enemies", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }, { kind: "cohort", at: { q: 3, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 4, r: 4 } }],
    });
    const dacian = at(s, 4, 4);
    strictEqual(adjacentEnemies(s, dacian).length, 2);
    ok(isFlanked(s, dacian));
  });

  it("cannot touch a unit in orbis", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 4, r: 2 } }, { kind: "warband", at: { q: 5, r: 3 } }],
    });
    const cohort = at(s, 4, 3);
    ok(isFlanked(s, cohort));
    setFormation(s, cohort, "orbis");
    strictEqual(isFlanked(s, cohort), false);
  });
});

describe("combat", () => {
  it("takes men off the target and adds them to the loss tally", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    const target = at(s, 5, 3);
    const before = target.men;
    melee(s, at(s, 4, 3), target);
    ok(target.men < before);
    strictEqual(s.track.enemyLosses, before - target.men);
  });

  it("hits harder from a wedge than from the line", () => {
    const line = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    melee(line, at(line, 4, 3), at(line, 5, 3));

    const wedge = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    setFormation(wedge, at(wedge, 4, 3), "cuneus");
    melee(wedge, at(wedge, 4, 3), at(wedge, 5, 3));

    ok(wedge.track.enemyLosses > line.track.enemyLosses);
  });

  it("lets a testudo shrug off most of an arrow storm", () => {
    const open = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    shoot(open, at(open, 6, 3), at(open, 4, 3));

    const shielded = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    setFormation(shielded, at(shielded, 4, 3), "testudo");
    shoot(shielded, at(shielded, 6, 3), at(shielded, 4, 3));

    ok(shielded.track.missileLosses * 3 < open.track.missileLosses, "testudo should cut missile losses sharply");
  });

  it("counts arrow losses as missile losses and melee losses as neither", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    shoot(s, at(s, 6, 3), at(s, 4, 3));
    strictEqual(s.track.missileLosses, s.track.playerLosses);
  });

  it("throws pila once, without retaliation, and only while they are on the shoulder", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    const cohort = at(s, 4, 3);
    throwPila(s, cohort, at(s, 5, 3));
    strictEqual(cohort.pila, 0);
    strictEqual(s.track.playerLosses, 0, "a volley draws no counter-attack");
    strictEqual(pilaTargets(s, cohort).length, 0, "and there is no second volley");
  });

  it("marks the pila objective broken when a cohort draws steel first", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    melee(s, at(s, 4, 3), at(s, 5, 3));
    ok(s.track.pilaViolated);
  });

  it("removes a unit that falls under a quarter strength and records who broke it", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    const dacian = at(s, 5, 3);
    dacian.men = Math.floor(dacian.maxMen * 0.26);
    const cohort = at(s, 4, 3);
    setFormation(s, cohort, "cuneus");
    melee(s, cohort, dacian);
    strictEqual(unitsOf(s, "enemy").length, 0);
    strictEqual(s.track.cuneusKills, 1);
  });

  it("does not let a spent unit act twice", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    const cohort = at(s, 4, 3);
    const target = at(s, 5, 3);
    melee(s, cohort, target);
    const after = target.men;
    melee(s, cohort, target);
    strictEqual(target.men, after);
  });

  it("only offers ranged targets inside the unit's range", () => {
    const s = field({
      rome: [{ kind: "aux_archers", at: { q: 1, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 3, r: 3 } }, { kind: "warband", at: { q: 8, r: 3 } }],
    });
    strictEqual(rangedTargets(s, at(s, 1, 3)).length, 1);
  });
});

describe("the turn", () => {
  it("refreshes both sides and advances the count only when Rome comes round again", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 3 } }],
    });
    at(s, 4, 3).moved = true;
    strictEqual(endTurn(s), "enemy");
    strictEqual(s.turn, 1);
    strictEqual(at(s, 4, 3).moved, false);
    strictEqual(endTurn(s), "player");
    strictEqual(s.turn, 2);
  });

  it("ends in victory when the last Dacian is gone", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 4, r: 3 } }] });
    checkOver(s);
    strictEqual(s.over?.won, true);
  });

  it("ends in defeat when the light runs out", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 3 } }],
      maxTurns: 2,
    });
    for (let i = 0; i < 6 && !s.over; i++) endTurn(s);
    strictEqual(s.over?.won, false);
  });

  it("counts a testudo held under fire, and does not count one out of range", () => {
    const near = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    setFormation(near, at(near, 4, 3), "testudo");
    endTurn(near);
    strictEqual(near.track.testudoTurnsUnderFire, 1);

    const far = field({
      rome: [{ kind: "cohort", at: { q: 0, r: 0 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 9, r: 7 } }],
    });
    setFormation(far, at(far, 0, 0), "testudo");
    endTurn(far);
    strictEqual(far.track.testudoTurnsUnderFire, 0);
  });

  it("counts an orbis only while cataphracts are actually on it", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "cataphracts", at: { q: 5, r: 3 } }],
    });
    setFormation(s, at(s, 4, 3), "orbis");
    endTurn(s);
    strictEqual(s.track.orbisHeldTurns, 1);
  });
});
