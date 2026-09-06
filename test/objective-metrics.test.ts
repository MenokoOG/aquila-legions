import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { MetricBag, Objective } from "../shared/types.js";
import { METRICS, METRIC_KEYS } from "../shared/data/metrics.js";
import { objectiveDetail, objectiveMet, objectiveStatus, testObjective } from "../shared/objectives.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { sanitizeStats } from "../server/progress.js";

/**
 * Objectives are comparisons against metrics, judged in one place by both the
 * sidebar and the server. These are the tests that keep that one place honest,
 * and that keep the shipped scenario data inside what it can express.
 */

function bag(over: Partial<MetricBag> = {}): MetricBag {
  const m = {} as MetricBag;
  for (const k of METRIC_KEYS) m[k] = 0;
  return { ...m, ...over };
}

function objective(over: Partial<Objective>): Objective {
  return {
    id: "test", text: "", metric: "cuneusKills", compare: "gte", points: 10,
    hint: "A sentence long enough to be worth reading.",
    ...over,
  };
}

describe("the objective comparator", () => {
  it("reads a count as at-least and a cap as strictly-under", () => {
    const count = objective({ metric: "flankKills", compare: "gte", value: 2 });
    ok(!testObjective(count, bag({ flankKills: 1 })));
    ok(testObjective(count, bag({ flankKills: 2 })));
    ok(testObjective(count, bag({ flankKills: 9 })));

    const cap = objective({ metric: "missileLosses", compare: "lt", value: 150 });
    ok(testObjective(cap, bag({ missileLosses: 149 })));
    ok(!testObjective(cap, bag({ missileLosses: 150 })));
  });

  it("scores nothing in a defeat, however well the lesson went", () => {
    const o = objective({ metric: "cuneusKills", compare: "gte", value: 1 });
    ok(objectiveMet(o, { won: true, metrics: bag({ cuneusKills: 5 }) }));
    ok(!objectiveMet(o, { won: false, metrics: bag({ cuneusKills: 5 }) }));
  });

  it("settles a count as soon as it is reached and a breach as soon as it happens", () => {
    const count = objective({ metric: "cuneusKills", compare: "gte", value: 2 });
    strictEqual(objectiveStatus(count, bag({ cuneusKills: 1 }), null), "pending");
    strictEqual(objectiveStatus(count, bag({ cuneusKills: 2 }), null), "done");

    const clean = objective({ metric: "cohortsRouted", compare: "zero" });
    strictEqual(objectiveStatus(clean, bag(), null), "pending", "a cohort can still break");
    strictEqual(objectiveStatus(clean, bag({ cohortsRouted: 1 }), null), "failed");
    strictEqual(objectiveStatus(clean, bag(), { won: true }), "done");
  });

  it("calls a clean objective done early once nothing is left that could break it", () => {
    const pila = objective({
      metric: "pilaSkipped", compare: "zero", outstanding: "cohortsYetToThrow",
    });
    strictEqual(objectiveStatus(pila, bag({ cohortsYetToThrow: 2 }), null), "pending");
    strictEqual(objectiveDetail(pila, bag({ cohortsYetToThrow: 2 })), "2 yet to throw");
    strictEqual(objectiveStatus(pila, bag({ cohortsYetToThrow: 0 }), null), "done");
    strictEqual(objectiveStatus(pila, bag({ cohortsYetToThrow: 0, pilaSkipped: 1 }), null), "failed",
      "a cohort that drew first fails it even after the rest have thrown");
  });

  it("hangs the victory on the battle, not on a count", () => {
    const win = objective({ metric: "enemiesLeft", compare: "victory" });
    strictEqual(objectiveStatus(win, bag({ enemiesLeft: 3 }), null), "pending");
    strictEqual(objectiveDetail(win, bag({ enemiesLeft: 3 })), "3 enemy left");
    strictEqual(objectiveStatus(win, bag(), { won: false }), "failed");
    strictEqual(objectiveStatus(win, bag(), { won: true }), "done");
    strictEqual(objectiveDetail(win, bag()), "field cleared");
  });
});

describe("the shipped objectives", () => {
  it("are well formed, and unique within their scenario", () => {
    for (const s of SCENARIOS) {
      const seen = new Set<string>();
      for (const o of s.objectives) {
        ok(!seen.has(o.id), `${s.id} asks for "${o.id}" twice`);
        seen.add(o.id);
        ok(o.metric in METRICS, `${s.id}/${o.id} measures nothing`);
        ok(o.points > 0, `${s.id}/${o.id} is worth nothing`);
        ok(o.hint.length > 20, `${s.id}/${o.id} needs a usable hint`);
        if (o.compare === "gte" || o.compare === "lt") {
          ok(typeof o.value === "number" && o.value > 0, `${s.id}/${o.id} compares against nothing`);
        }
        if (o.outstanding) ok(o.compare === "zero", `${s.id}/${o.id} only counts down for a clean objective`);
      }
    }
  });

  it("pays for the win, however that scenario is won", () => {
    for (const s of SCENARIOS) {
      // Either an objective that scores on any victory, or one that asks for
      // exactly what the victory condition asks for. Without one of those, a
      // player can take the field and be paid nothing for it.
      const v = s.victory;
      const paid = s.objectives.some((o) => o.compare === "victory"
        || (v && o.metric === v.metric && o.compare === v.compare && o.value === v.value));
      ok(paid, `${s.id} pays nothing for winning`);
    }
  });

  it("gives every explicit victory condition something to measure", () => {
    for (const s of SCENARIOS) {
      const v = s.victory;
      if (!v) continue;
      ok(v.metric in METRICS, `${s.id} wins on an unmeasured "${v.metric}"`);
      ok(v.text.length > 8, `${s.id} does not say what winning is`);
      if (v.compare === "gte" || v.compare === "lt") {
        ok(typeof v.value === "number" && v.value > 0, `${s.id} compares its victory against nothing`);
      }
    }
  });

  it("all read something the battle actually measures", () => {
    const measured = new Set(METRIC_KEYS);
    for (const s of SCENARIOS) {
      for (const o of s.objectives) {
        ok(measured.has(o.metric), `${s.id}/${o.id} reads an unmeasured "${o.metric}"`);
        if (o.outstanding) ok(measured.has(o.outstanding), `${s.id}/${o.id} counts down an unmeasured metric`);
      }
    }
  });
});

describe("a posted battle report", () => {
  it("is filled out and cleaned rather than believed", () => {
    const out = sanitizeStats({
      won: "yes",
      metrics: { cuneusKills: 2.7, flankKills: -5, missileLosses: "300", enemiesLeft: Infinity, nonsense: 9 },
    });
    strictEqual(out.won, false, "only a real boolean wins a battle");
    strictEqual(out.metrics.cuneusKills, 2, "counts are whole");
    strictEqual(out.metrics.flankKills, 0, "counts are never negative");
    strictEqual(out.metrics.missileLosses, 0, "a string is not a count");
    strictEqual(out.metrics.enemiesLeft, 0, "an infinity is not a count");
    for (const k of METRIC_KEYS) strictEqual(typeof out.metrics[k], "number", `${k} is missing`);
    ok(!("nonsense" in out.metrics), "nothing the game does not measure gets through");
  });

  it("survives a report with nothing in it at all", () => {
    const out = sanitizeStats(null);
    strictEqual(out.won, false);
    for (const k of METRIC_KEYS) strictEqual(out.metrics[k], 0);
  });
});
