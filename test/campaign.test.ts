import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { CAMPAIGNS, campaignFor } from "../shared/data/campaigns.js";
import { UNITS } from "../shared/data/units.js";
import { FORMATIONS, FORMATION_ORDER } from "../shared/data/formations.js";
import { createBattle, faction, opposing, toStats, unitsOf } from "../client/src/engine/battle.js";
import { endTurn } from "../client/src/engine/rules.js";
import { enemyTurn } from "../client/src/engine/ai/index.js";
import { fixRoll } from "./helpers.js";

/**
 * The refactor that made the engine campaign-agnostic. These guard the seams a
 * second era will lean on: scenarios reference a real campaign, every placement
 * names a unit that exists, and a whole battle still reaches a decision.
 */

describe("the campaign registry", () => {
  it("gives every scenario a campaign that exists", () => {
    for (const s of SCENARIOS) {
      ok(CAMPAIGNS.some((c) => c.id === s.campaignId), `${s.id} points at ${s.campaignId}`);
    }
  });

  it("falls back rather than throwing on a campaign it has never heard of", () => {
    strictEqual(campaignFor("atlantis").id, CAMPAIGNS[0]!.id);
  });

  it("names both sides for every campaign", () => {
    for (const c of CAMPAIGNS) {
      for (const f of [c.player, c.enemy]) {
        ok(f.name.length > 0 && f.adjective.length > 0 && f.plural.length > 0, `${c.id} is missing a name`);
      }
    }
  });
});

describe("the roster", () => {
  it("places only units the game actually has", () => {
    for (const s of SCENARIOS) {
      for (const p of [...s.player, ...s.enemy]) {
        ok(p.kind in UNITS, `${s.id} places an unknown "${p.kind}"`);
      }
    }
  });

  it("puts every scenario's units on the side the scenario expects", () => {
    for (const s of SCENARIOS) {
      for (const p of s.player) strictEqual(UNITS[p.kind as keyof typeof UNITS].side, "player", `${s.id}/${p.kind}`);
      for (const p of s.enemy) strictEqual(UNITS[p.kind as keyof typeof UNITS].side, "enemy", `${s.id}/${p.kind}`);
    }
  });

  it("gives every unit a board glyph, so the renderer never falls back to a question mark", () => {
    for (const [kind, t] of Object.entries(UNITS)) ok(t.glyph.length > 0, `${kind} has no glyph`);
  });
});

describe("formations as data", () => {
  it("offers every defined formation in the orders panel", () => {
    strictEqual(FORMATION_ORDER.length, Object.keys(FORMATIONS).length);
    for (const f of FORMATION_ORDER) ok(FORMATIONS[f], `${f} is offered but not defined`);
  });

  it("keeps the tortoise slow and shielded and the wedge sharp and exposed", () => {
    ok(FORMATIONS.testudo.missileMul < 1 && FORMATIONS.testudo.moveOverride === 1);
    ok(FORMATIONS.cuneus.attackMul > 1 && FORMATIONS.cuneus.defenseMul < 1);
    ok(FORMATIONS.orbis.ignoresFlanking && FORMATIONS.orbis.moveOverride === 0);
  });
});

describe("sides", () => {
  it("has exactly two, and each is the other's opposite", () => {
    strictEqual(opposing("player"), "enemy");
    strictEqual(opposing("enemy"), "player");
  });

  it("reads a battle's names off its campaign rather than off the rules", () => {
    const s = createBattle(SCENARIOS[0]!);
    strictEqual(faction(s, "player").name, "Rome");
    strictEqual(faction(s, "enemy").adjective, "Dacian");
    ok(s.log[0]!.text.includes("The legion deploys"), s.log[0]!.text);
  });
});

describe("a whole battle", () => {
  it("plays every scenario to a decision without the engine naming a people", () => {
    fixRoll(1);
    for (const scenario of SCENARIOS) {
      const s = createBattle(scenario);
      // Both sides driven by the same AI, so the fight resolves rather than stalling.
      let guard = 0;
      while (!s.over && guard < 400) {
        guard += 1;
        for (const _ of enemyTurn(s)) { /* the generator does the work */ }
        if (s.over) break;
        endTurn(s);
      }
      ok(s.over, `${scenario.id} never reached a decision`);
      const stats = toStats(s).metrics;
      ok(stats.turns >= 1, `${scenario.id} recorded no turns`);
      ok(stats.playerLosses + stats.enemyLosses > 0, `${scenario.id} was fought without a casualty`);
      ok(unitsOf(s, "player").length === 0 || unitsOf(s, "enemy").length === 0 || stats.turns > scenario.maxTurns,
        `${scenario.id} ended with both armies intact and time to spare`);
    }
  });
});
