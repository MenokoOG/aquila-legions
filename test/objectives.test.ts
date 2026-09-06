import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import type { Objective } from "../shared/types.js";
import { objectiveProgress } from "../client/src/engine/objectives.js";
import { endTurn, melee, setFormation, shoot, throwPila } from "../client/src/engine/rules.js";
import { WIN, at, field, fixRoll } from "./helpers.js";

/** The live objective readout is the game telling you whether the lesson is landing. */

const hint = "Something the after-action review can tell you to do differently.";
const PILA: Objective = {
  id: "pila_before_melee", text: "Throw first", metric: "pilaSkipped", compare: "zero",
  outstanding: "cohortsYetToThrow", points: 75, hint,
};
const NO_ROUT: Objective = {
  id: "no_cohort_routed", text: "No cohort routs", metric: "cohortsRouted", compare: "zero", points: 50, hint,
};
const UNDER_FIRE: Objective = {
  id: "testudo_under_fire", text: "Hold the tortoise", metric: "testudoTurnsUnderFire", compare: "gte",
  value: 2, points: 60, hint,
};
const MISSILES: Objective = {
  id: "missile_losses_under", text: "Lose under 200 to arrows", metric: "missileLosses", compare: "lt",
  value: 200, points: 60, hint,
};

describe("live objectives", () => {
  beforeEach(() => fixRoll(1));

  it("holds the win pending until the field is clear", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 3 } }],
    });
    strictEqual(objectiveProgress(WIN, s).status, "pending");
    s.over = { won: true, reason: "" };
    strictEqual(objectiveProgress(WIN, s).status, "done");
  });

  it("fails the pila objective the moment a cohort draws steel first", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    strictEqual(objectiveProgress(PILA, s).status, "pending");
    melee(s, at(s, 4, 3), at(s, 5, 3));
    strictEqual(objectiveProgress(PILA, s).status, "failed");
  });

  it("marks the pila objective done once every standing cohort has thrown", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    strictEqual(objectiveProgress(PILA, s).detail, "1 yet to throw");
    throwPila(s, at(s, 4, 3), at(s, 5, 3));
    strictEqual(objectiveProgress(PILA, s).status, "done");
    strictEqual(objectiveProgress(PILA, s).detail, "all thrown");
  });

  it("fails the no-rout objective when a cohort breaks, but not when an auxiliary does", () => {
    const s = field({
      rome: [{ kind: "aux_infantry", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 3 } }],
    });
    const aux = at(s, 4, 3);
    aux.men = Math.floor(aux.maxMen * 0.26);
    melee(s, at(s, 5, 3), aux);
    strictEqual(objectiveProgress(NO_ROUT, s).status, "pending", "auxiliaries are not cohorts");

    const legion = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 3 } }],
    });
    const cohort = at(legion, 4, 3);
    cohort.men = Math.floor(cohort.maxMen * 0.26);
    melee(legion, at(legion, 5, 3), cohort);
    strictEqual(objectiveProgress(NO_ROUT, legion).status, "failed");
  });

  it("counts up to the target and then reports done", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    setFormation(s, at(s, 4, 3), "testudo");
    endTurn(s);
    const half = objectiveProgress(UNDER_FIRE, s);
    strictEqual(half.status, "pending");
    strictEqual(half.detail, "1 / 2");
    endTurn(s);
    endTurn(s);
    strictEqual(objectiveProgress(UNDER_FIRE, s).status, "done");
  });

  it("fails a loss cap the moment it is passed", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    strictEqual(objectiveProgress(MISSILES, s).status, "pending");
    s.track.missileLosses = 200;
    strictEqual(objectiveProgress(MISSILES, s).status, "failed");
  });

  it("always has something to say about how to meet it", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 4, r: 3 } }] });
    for (const o of [WIN, PILA, NO_ROUT, UNDER_FIRE, MISSILES]) {
      ok(objectiveProgress(o, s).hint.length > 20, `${o.id} needs a usable hint`);
    }
  });

  it("does not count a shot that never reached anyone as a missile loss", () => {
    const s = field({
      rome: [{ kind: "aux_archers", at: { q: 3, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    shoot(s, at(s, 3, 3), at(s, 5, 3));
    strictEqual(s.track.missileLosses, 0, "missile losses are Roman losses only");
  });
});
