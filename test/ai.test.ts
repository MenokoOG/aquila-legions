import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { type BattleState, type BattleUnit, unitsOf } from "../client/src/engine/battle.js";
import { enemyTurn } from "../client/src/engine/ai/index.js";
import { endTurn, isFlanked } from "../client/src/engine/rules.js";
import { distance } from "../client/src/hex.js";
import { at, field, fixRoll } from "./helpers.js";

/**
 * The opponent is the game. These are the behaviours a player is meant to be
 * able to learn and plan against, so each one is pinned here: if the host stops
 * concentrating, stops going round a flank, or starts feeding itself into the
 * legion one warband at a time, a test says so.
 */

function runEnemy(s: BattleState): void {
  for (const _ of enemyTurn(s)) { /* the generator does the work */ }
}

/** Hand the turn to the enemy and let it act. */
function enemyMoves(s: BattleState): void {
  endTurn(s);
  runEnemy(s);
}

function contact(s: BattleState): boolean {
  return unitsOf(s, "enemy").some((e) =>
    unitsOf(s, "player").some((p) => distance(e.at, p.at) <= 1));
}

describe("the enemy host", () => {
  beforeEach(() => fixRoll(1));

  it("concentrates on one cohort rather than each warband picking its own", () => {
    const s = field({
      ai: "seasoned",
      rome: [
        { kind: "cohort", at: { q: 4, r: 2 }, label: "Fresh" },
        { kind: "cohort", at: { q: 4, r: 5 }, label: "Hurt" },
      ],
      dacia: [
        { kind: "warband", at: { q: 6, r: 2 } },
        { kind: "warband", at: { q: 6, r: 5 } },
      ],
    });
    const hurt = at(s, 4, 5);
    hurt.men = Math.floor(hurt.maxMen * 0.45);
    const fresh = at(s, 4, 2);
    const beforeHurt = hurt.men;
    const beforeFresh = fresh.men;

    enemyMoves(s);

    ok(beforeHurt - hurt.men > beforeFresh - fresh.men,
      "the host put its weight on the cohort that was already breaking");
  });

  it("goes round to a hex that flanks rather than the first hex it reaches", () => {
    const s = field({
      ai: "seasoned",
      rome: [{ kind: "cohort", at: { q: 5, r: 4 } }],
      dacia: [
        { kind: "warband", at: { q: 6, r: 4 } },
        { kind: "warband", at: { q: 2, r: 4 } },
      ],
    });
    const cohort = at(s, 5, 4);
    enemyMoves(s);
    ok(isFlanked(s, cohort), "the second warband came round to a hex that flanks");
  });

  it("does not stand its archers in a sword fight", () => {
    const s = field({
      ai: "seasoned",
      rome: [{ kind: "cohort", at: { q: 5, r: 4 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 4 } }],
    });
    const cohort = at(s, 5, 4);
    const before = cohort.men;
    enemyMoves(s);
    const archers = unitsOf(s, "enemy")[0]!;
    ok(distance(archers.at, cohort.at) > 1, "the archers stepped out of contact");
    ok(distance(archers.at, cohort.at) <= archers.tmpl.range, "and stayed in range");
    ok(cohort.men < before, "and still shot");
  });

  it("charges with the horse instead of walking into contact", () => {
    const s = field({
      ai: "veteran",
      rome: [{ kind: "cohort", at: { q: 3, r: 4 } }],
      dacia: [{ kind: "cataphracts", at: { q: 8, r: 4 } }],
    });
    enemyMoves(s);
    const horse = unitsOf(s, "enemy")[0]!;
    ok(horse.movedDist >= 2, `covered ${horse.movedDist} hexes, which is not a charge`);
  });

  it("would rather shoot a cohort in the open than one under its shields", () => {
    const s = field({
      ai: "seasoned",
      rome: [
        { kind: "cohort", at: { q: 5, r: 2 }, label: "Shielded" },
        { kind: "cohort", at: { q: 5, r: 6 }, label: "Open" },
      ],
      dacia: [{ kind: "dacian_archers", at: { q: 7, r: 4 } }],
    });
    const shielded = at(s, 5, 2);
    const open = at(s, 5, 6);
    shielded.formation = "testudo";
    const beforeShielded = shielded.men;
    const beforeOpen = open.men;

    enemyMoves(s);

    strictEqual(shielded.men, beforeShielded, "the tortoise was left alone");
    ok(open.men < beforeOpen, "the cohort in the open took the arrows");
  });

  it("declines a charge that would break the warband making it", () => {
    const s = field({
      ai: "veteran",
      rome: [{ kind: "first_cohort", at: { q: 5, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 6, r: 4 } }],
    });
    const warband = at(s, 6, 4);
    warband.men = Math.floor(warband.maxMen * 0.3);
    const cohort = at(s, 5, 4);
    const before = cohort.men;

    enemyMoves(s);

    strictEqual(cohort.men, before, "a broken warband did not spend itself for nothing");
    ok(s.units.includes(warband), "and is still on the board");
  });

  it("still throws itself forward when it is raw", () => {
    const s = field({
      ai: "raw",
      rome: [{ kind: "first_cohort", at: { q: 5, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 6, r: 4 } }],
    });
    const warband = at(s, 6, 4);
    warband.men = Math.floor(warband.maxMen * 0.3);
    const cohort = at(s, 5, 4);
    const before = cohort.men;

    enemyMoves(s);

    ok(cohort.men < before, "raw men do not count the odds");
  });

  it("waits for a neighbour instead of walking into the legion alone", () => {
    const s = field({
      ai: "veteran",
      maxTurns: 20,
      rome: [
        { kind: "cohort", at: { q: 5, r: 3 } },
        { kind: "cohort", at: { q: 5, r: 5 } },
      ],
      // One warband in reach of contact, its nearest fellow far behind.
      dacia: [
        { kind: "warband", at: { q: 8, r: 4 } },
        { kind: "warband", at: { q: 9, r: 9 } },
      ],
    });
    enemyMoves(s);
    ok(!contact(s), "the lead warband held rather than going in on its own");
  });

  it("commits anyway once the battle is half gone", () => {
    const s = field({
      ai: "veteran",
      maxTurns: 6,
      rome: [{ kind: "cohort", at: { q: 5, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 4 } }],
    });
    for (let i = 0; i < 6 && !contact(s) && !s.over; i++) enemyMoves(s);
    ok(contact(s), "a host that never closes wins by the clock, which is not a fight");
  });

  it("closes with the legion at every level, and does not stall", () => {
    for (const ai of ["raw", "seasoned", "veteran"] as const) {
      const s = field({
        ai,
        maxTurns: 14,
        rome: [
          { kind: "cohort", at: { q: 2, r: 3 } },
          { kind: "cohort", at: { q: 2, r: 5 } },
        ],
        dacia: [
          { kind: "warband", at: { q: 9, r: 3 } },
          { kind: "warband", at: { q: 9, r: 5 } },
          { kind: "falxmen", at: { q: 9, r: 4 } },
        ],
      });
      let turns = 0;
      while (!contact(s) && !s.over && turns < 14) { enemyMoves(s); turns += 1; }
      ok(contact(s), `${ai} never reached the legion`);
    }
  });

  it("leaves a unit that has nothing to do rather than throwing it away", () => {
    const s = field({
      ai: "veteran",
      rome: [{ kind: "cohort", at: { q: 1, r: 1 } }],
      dacia: [{ kind: "warband", at: { q: 9, r: 7 } }],
    });
    const warband = at(s, 9, 7);
    const before = { ...warband.at };
    enemyMoves(s);
    ok(distance(warband.at, before) > 0, "it marched");
    ok(s.units.includes(warband));
  });

  it("never leaves a unit standing on another", () => {
    const s = field({
      ai: "veteran",
      rome: [
        { kind: "cohort", at: { q: 4, r: 4 } },
        { kind: "aux_archers", at: { q: 3, r: 4 } },
      ],
      dacia: [
        { kind: "warband", at: { q: 7, r: 3 } },
        { kind: "warband", at: { q: 7, r: 4 } },
        { kind: "warband", at: { q: 7, r: 5 } },
        { kind: "dacian_archers", at: { q: 9, r: 4 } },
      ],
    });
    for (let i = 0; i < 6 && !s.over; i++) {
      enemyMoves(s);
      const seen = new Set<string>();
      for (const u of s.units as BattleUnit[]) {
        const k = `${u.at.q},${u.at.r}`;
        ok(!seen.has(k), `two units on ${k}`);
        seen.add(k);
      }
    }
  });
});
