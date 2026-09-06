import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { advise } from "../client/src/advisor/tips.js";
import { firedTriggers, noteFromTip, tagsOf } from "../client/src/advisor/commentarii.js";
import { TRIGGERS } from "../shared/data/triggers.js";
import { METRIC_KEYS } from "../shared/data/metrics.js";
import { endTurn, melee, setFormation, throwPila } from "../client/src/engine/rules.js";
import { at, field, fixRoll } from "./helpers.js";

/**
 * The Praefectus says nothing the player could not have worked out, and says it
 * only when it is true. These tests are the second half of that promise: each
 * one puts the board in the state a tip is about and asks for the tip.
 */

function texts(s: Parameters<typeof advise>[0]): string {
  return advise(s).map((t) => t.text).join(" | ");
}

describe("the Praefectus", () => {
  beforeEach(() => fixRoll(1));

  it("says nothing at all once the battle is decided", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 4, r: 3 } }] });
    s.over = { won: true, reason: "" };
    strictEqual(advise(s).length, 0);
  });

  it("says nothing while it is the enemy's turn", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 3 } }],
    });
    endTurn(s);
    strictEqual(advise(s).length, 0);
  });

  it("calls for the tortoise when a cohort is in bow range in the open", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "dacian_archers", at: { q: 6, r: 3 } }],
    });
    ok(/[Tt]estudo/.test(texts(s)), texts(s));
    setFormation(s, at(s, 4, 3), "testudo");
    ok(!/Testudo takes three quarters/.test(texts(s)), "and stops once the shields are up");
  });

  it("does not call for the tortoise on a cohort already at the sword", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 5, r: 3 } }],
      dacia: [
        { kind: "dacian_archers", at: { q: 7, r: 3 } },
        { kind: "warband", at: { q: 6, r: 3 } },
      ],
    });
    ok(!/Testudo takes three quarters/.test(texts(s)), "a tortoise cannot fight");
  });

  it("stops a cohort drawing steel with its pila unthrown, and says why it matters", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    ok(/pila/.test(texts(s)));
    const top = advise(s)[0]!;
    strictEqual(top.unitId, at(s, 4, 3).id, "and points at the cohort it means");
    throwPila(s, at(s, 4, 3), at(s, 5, 3));
    ok(!/still has its pila/.test(texts(s)), "and stops once the volley has gone");
  });

  it("warns when the counter-attack could break the unit making the charge", () => {
    const s = field({
      rome: [{ kind: "aux_archers", at: { q: 4, r: 3 } }, { kind: "cohort", at: { q: 4, r: 5 } }],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 3 } }],
    });
    const weak = at(s, 4, 3);
    weak.men = Math.floor(weak.maxMen * 0.3);
    ok(/counter-attack could break/.test(texts(s)) || /down to /.test(texts(s)), texts(s));
  });

  it("offers the circle when horsemen can reach a cohort next turn", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      dacia: [{ kind: "cataphracts", at: { q: 8, r: 4 } }],
    });
    ok(/Orbis/.test(texts(s)), texts(s));
    setFormation(s, at(s, 4, 4), "orbis");
    ok(!/Orbis cannot be flanked/.test(texts(s)), "and stops once the circle is formed");
  });

  it("puts the unit about to break ahead of everything else", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [
        { kind: "warband", at: { q: 5, r: 3 } },
        { kind: "dacian_archers", at: { q: 6, r: 4 } },
      ],
    });
    const cohort = at(s, 4, 3);
    cohort.men = Math.floor(cohort.maxMen * 0.3);
    const top = advise(s)[0]!;
    ok(/routs under a quarter/.test(top.text), top.text);
  });

  it("counts the clock down when the field is not clear", () => {
    const s = field({
      maxTurns: 4,
      rome: [{ kind: "cohort", at: { q: 2, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 9, r: 3 } }],
    });
    ok(/turns left|turn left/.test(texts(s)), texts(s));
  });

  it("has something to say about an ordinary quiet board", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 2, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 9, r: 7 } }],
    });
    ok(advise(s).length > 0, "the panel is never blank on your own turn");
  });
});

describe("the Commentarii", () => {
  beforeEach(() => fixRoll(1));

  it("only names metrics the battle actually measures", () => {
    const measured = new Set(METRIC_KEYS);
    for (const t of TRIGGERS) {
      ok(measured.has(t.metric), `${t.id} reads an unmeasured "${t.metric}"`);
      ok(t.note.length > 80, `${t.id} needs a note worth keeping`);
      ok(t.tags.length > 0, `${t.id} needs a tag to file under`);
    }
  });

  it("files a note the moment the thing happens", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    strictEqual(firedTriggers(s, new Set()).some((n) => n.id === "first_pila"), false);
    throwPila(s, at(s, 4, 3), at(s, 5, 3));
    const fired = firedTriggers(s, new Set());
    const note = fired.find((n) => n.id === "first_pila");
    ok(note, "the first volley wrote its own page");
    strictEqual(note.source, "trigger");
    strictEqual(note.scenarioId, s.scenario.id);
  });

  it("never files the same note twice", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
    });
    throwPila(s, at(s, 4, 3), at(s, 5, 3));
    ok(firedTriggers(s, new Set()).some((n) => n.id === "first_pila"));
    strictEqual(firedTriggers(s, new Set(["first_pila"])).some((n) => n.id === "first_pila"), false);
  });

  it("files the note about losing a cohort only when a cohort is lost", () => {
    const s = field({
      rome: [{ kind: "aux_infantry", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 3 } }],
    });
    const aux = at(s, 4, 3);
    aux.men = Math.floor(aux.maxMen * 0.26);
    melee(s, at(s, 5, 3), aux);
    strictEqual(firedTriggers(s, new Set()).some((n) => n.id === "first_cohort_lost"), false,
      "an auxiliary is not a cohort of the line");
  });

  it("keeps a tip under an id that names the battle it was given in", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 4, r: 3 } }] });
    const note = noteFromTip(s, { id: "clock", urgency: 1, text: "Two turns left." });
    strictEqual(note.id, `tip:${s.scenario.id}:clock`);
    strictEqual(note.source, "tip");
    ok(note.tags.includes("praefectus"));
  });

  it("orders the tag list by how much is filed under each", () => {
    const now = new Date().toISOString();
    const entry = (id: string, tags: string[]) =>
      ({ id, source: "trigger" as const, title: id, body: "", tags, scenarioId: "", at: now });
    const tags = tagsOf([
      entry("a", ["pilum", "drill"]),
      entry("b", ["pilum"]),
      entry("c", ["testudo"]),
    ]);
    strictEqual(tags[0], "pilum");
    strictEqual(tags.length, 3);
  });
});
