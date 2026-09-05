import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { forecast } from "../client/src/engine/forecast.js";
import { ROLL_MAX, ROLL_MIN, melee, setFormation, shoot } from "../client/src/engine/rules.js";
import { at, field, fixRoll } from "./helpers.js";

/** The forecast is only worth showing if the real blow always lands inside it. */

function skirmish() {
  return field({
    rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
    dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
  });
}

describe("combat forecast", () => {
  beforeEach(() => fixRoll(1));

  it("brackets the luckiest and unluckiest melee the rules can roll", () => {
    for (const roll of [ROLL_MIN, 1, ROLL_MAX]) {
      const s = skirmish();
      const f = forecast(s, at(s, 4, 3), at(s, 5, 3), "melee");
      fixRoll(roll);
      const target = at(s, 5, 3);
      const before = target.men;
      melee(s, at(s, 4, 3), target);
      const dealt = before - target.men;
      ok(dealt >= f.dealt.min && dealt <= f.dealt.max, `dealt ${dealt} outside ${f.dealt.min}-${f.dealt.max}`);
      ok(s.track.romanLosses >= f.taken!.min && s.track.romanLosses <= f.taken!.max,
        `taken ${s.track.romanLosses} outside ${f.taken!.min}-${f.taken!.max}`);
    }
  });

  it("brackets a volley the same way", () => {
    for (const roll of [ROLL_MIN, ROLL_MAX]) {
      const s = field({
        rome: [{ kind: "aux_archers", at: { q: 3, r: 3 } }],
        dacia: [{ kind: "warband", at: { q: 5, r: 3 } }],
      });
      const f = forecast(s, at(s, 3, 3), at(s, 5, 3), "shoot");
      fixRoll(roll);
      const target = at(s, 5, 3);
      const before = target.men;
      shoot(s, at(s, 3, 3), target);
      const dealt = before - target.men;
      ok(dealt >= f.dealt.min && dealt <= f.dealt.max);
    }
  });

  it("promises no counter-attack from a volley or a pilum throw", () => {
    const s = skirmish();
    strictEqual(forecast(s, at(s, 4, 3), at(s, 5, 3), "pila").taken, null);
  });

  it("calls the break certain when even the worst roll routs them", () => {
    const s = skirmish();
    const target = at(s, 5, 3);
    target.men = Math.floor(target.maxMen * 0.26);
    const f = forecast(s, at(s, 4, 3), target, "melee");
    strictEqual(f.breaks, "certain");
    strictEqual(f.taken, null, "a unit that is certain to break cannot answer");
  });

  it("sees no break coming against a unit at full strength", () => {
    const s = skirmish();
    strictEqual(forecast(s, at(s, 4, 3), at(s, 5, 3), "melee").breaks, "no");
  });

  it("flags the charge as risky when the counter could break the cohort", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 3 } }],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 3 } }],
    });
    const cohort = at(s, 4, 3);
    cohort.men = Math.floor(cohort.maxMen * 0.27);
    ok(forecast(s, cohort, at(s, 5, 3), "melee").risky);
  });

  it("forecasts a heavier blow from a wedge than from the line", () => {
    const line = skirmish();
    const flat = forecast(line, at(line, 4, 3), at(line, 5, 3), "melee");
    const wedge = skirmish();
    setFormation(wedge, at(wedge, 4, 3), "cuneus");
    const sharp = forecast(wedge, at(wedge, 4, 3), at(wedge, 5, 3), "melee");
    ok(sharp.dealt.min > flat.dealt.min);
  });
});
