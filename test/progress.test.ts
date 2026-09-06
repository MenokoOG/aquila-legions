import { deepStrictEqual, ok, strictEqual, throws } from "node:assert/strict";
import { describe, it } from "node:test";
import type { BattleStats, MetricBag, Objective, SaveState } from "../shared/types.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { CODEX } from "../shared/data/codex.js";
import { objectiveMet } from "../shared/objectives.js";
import { applyResult, freshSave, isUnlocked, rankFor, sanitizeSave } from "../server/progress.js";

function stats(over: Partial<MetricBag> = {}, won = true): BattleStats {
  return {
    won,
    metrics: {
      enemiesLeft: 0, turns: 6, playerLosses: 100, enemyLosses: 900,
      pilaSkipped: 0, cohortsYetToThrow: 0, pilaVolleys: 0, missileLosses: 0,
      keyHexesHeld: 0, unitsExtracted: 0, turnsSurvived: 6,
      cuneusKills: 0, flankKills: 0, cavalryKills: 0,
      cohortsRouted: 0, testudoTurnsUnderFire: 0, orbisHeldTurns: 0,
      ...over,
    },
  };
}

function objective(over: Partial<Objective>): Objective {
  return {
    id: "test", text: "", metric: "cuneusKills", compare: "gte", points: 1,
    hint: "A sentence long enough to be worth reading.",
    ...over,
  };
}

const FIRST = SCENARIOS[0]!;
const SECOND = SCENARIOS[1]!;

describe("objective scoring", () => {
  it("awards nothing at all for a lost battle", () => {
    for (const s of SCENARIOS) {
      for (const o of s.objectives) {
        strictEqual(objectiveMet(o, stats({ cuneusKills: 99 }, false)), false,
          `${s.id}/${o.id} should need the victory first`);
      }
    }
  });

  it("reads counting objectives as at-least and caps as strictly-under", () => {
    const cuneus = (value: number): Objective => objective({ metric: "cuneusKills", compare: "gte", value });
    const missiles = (value: number): Objective => objective({ metric: "missileLosses", compare: "lt", value });
    ok(objectiveMet(cuneus(2), stats({ cuneusKills: 2 })));
    ok(!objectiveMet(cuneus(3), stats({ cuneusKills: 2 })));
    ok(objectiveMet(missiles(200), stats({ missileLosses: 199 })));
    ok(!objectiveMet(missiles(200), stats({ missileLosses: 200 })));
  });
});

describe("rank", () => {
  it("climbs with history points and never drops below the first rung", () => {
    strictEqual(rankFor(0), "Tiro (Recruit)");
    strictEqual(rankFor(-50), "Tiro (Recruit)");
    ok(rankFor(1500) !== rankFor(0));
  });
});

describe("applying a result", () => {
  it("records the win, unlocks the codex, and pays out once", () => {
    const save = freshSave();
    const first = applyResult(save, { scenarioId: FIRST.id, stats: stats() });
    ok(first.pointsEarned > 0);
    ok(first.save.scenarios[FIRST.id]?.completed);
    deepStrictEqual(first.newCodex.map((c) => c.id), FIRST.unlocksCodex);

    const replay = applyResult(save, { scenarioId: FIRST.id, stats: stats() });
    strictEqual(replay.pointsEarned, 0, "the same objectives cannot be sold twice");
    strictEqual(replay.newCodex.length, 0);
    strictEqual(replay.save.scenarios[FIRST.id]?.attempts, 2);
  });

  it("pays for an objective picked up on a later attempt", () => {
    const save = freshSave();
    const sloppy = applyResult(save, { scenarioId: FIRST.id, stats: stats({ cohortsRouted: 1 }) });
    const afterFirst = sloppy.save.historyPoints;
    const clean = applyResult(save, { scenarioId: FIRST.id, stats: stats({ cohortsRouted: 0 }) });
    ok(clean.pointsEarned > 0, "the objective missed the first time is still worth points");
    strictEqual(clean.save.historyPoints, afterFirst + clean.pointsEarned);
  });

  it("counts a defeat as an attempt and unlocks nothing", () => {
    const save = freshSave();
    const out = applyResult(save, { scenarioId: FIRST.id, stats: stats({}, false) });
    strictEqual(out.pointsEarned, 0);
    strictEqual(out.save.codexUnlocked.length, 0);
    strictEqual(out.save.scenarios[FIRST.id]?.completed, false);
    strictEqual(out.save.battles, 1);
  });

  it("refuses a scenario it has never heard of", () => {
    throws(() => applyResult(freshSave(), { scenarioId: "atlantis", stats: stats() }), /unknown scenario/);
  });

  it("announces a promotion only on the battle that earns it", () => {
    const save = freshSave();
    save.historyPoints = 0;
    const out = applyResult(save, { scenarioId: FIRST.id, stats: stats() });
    strictEqual(out.rankUp, out.save.rank === "Tiro (Recruit)" ? null : out.save.rank);
  });
});

describe("campaign unlocks", () => {
  it("opens the first battle and holds the rest until the one before is won", () => {
    const save = freshSave();
    ok(isUnlocked(save, FIRST.id));
    ok(!isUnlocked(save, SECOND.id));
    applyResult(save, { scenarioId: FIRST.id, stats: stats() });
    ok(isUnlocked(save, SECOND.id));
  });

  it("never unlocks a scenario that does not exist", () => {
    ok(!isUnlocked(freshSave(), "atlantis"));
  });
});

describe("save sanitising", () => {
  it("falls back to a new campaign for junk", () => {
    for (const junk of [null, 42, "save", [], { version: 99 }]) {
      deepStrictEqual(sanitizeSave(junk).scenarios, {});
    }
  });

  it("drops scenarios and codex entries the game does not have", () => {
    const raw = {
      ...freshSave(),
      scenarios: { atlantis: { completed: true, bestPoints: 10, attempts: 1, objectivesMet: [] } },
      codexUnlocked: ["pilum", "not_a_real_entry"],
    };
    const clean = sanitizeSave(raw);
    strictEqual(clean.scenarios.atlantis, undefined);
    ok(clean.codexUnlocked.every((id) => CODEX.some((e) => e.id === id)));
  });

  it("clamps hand-edited numbers and recomputes the rank from them", () => {
    const clean = sanitizeSave({
      ...freshSave(),
      historyPoints: -9999,
      battles: 3.7,
      rank: "Imperator",
    } as unknown as SaveState);
    strictEqual(clean.historyPoints, 0);
    strictEqual(clean.battles, 3);
    strictEqual(clean.rank, rankFor(0), "a rank typed into the file is not believed");
  });

  it("keeps a good save intact", () => {
    const save = freshSave();
    applyResult(save, { scenarioId: FIRST.id, stats: stats() });
    const round = sanitizeSave(JSON.parse(JSON.stringify(save)));
    deepStrictEqual(round.scenarios, save.scenarios);
    strictEqual(round.historyPoints, save.historyPoints);
    deepStrictEqual(round.codexUnlocked, save.codexUnlocked);
  });

  it("trims a commander name to something a header can hold", () => {
    strictEqual(sanitizeSave({ ...freshSave(), commander: "  " }).commander, freshSave().commander);
    strictEqual(sanitizeSave({ ...freshSave(), commander: "x".repeat(99) }).commander.length, 32);
  });
});
