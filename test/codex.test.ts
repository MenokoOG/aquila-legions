import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX, CODEX_BY_ID, CODEX_CAMPAIGN, codexOf } from "../shared/data/codex.js";
import { ROSTERS, UNITS } from "../shared/data/units.js";
import { TERRAIN } from "../shared/data/terrain.js";
import { FORMATIONS } from "../shared/data/formations.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { freshSave, isCampaignUnlocked, isUnlocked, unlockAll } from "../server/progress.js";

/**
 * The Codex is the part of this game that makes a claim, so the guards here are
 * about it staying reachable and staying organised: every entry belongs to
 * exactly one era, every era's entries can actually be won, and the field
 * manual shows every unit the game has rather than the ones somebody remembered
 * to list.
 */

describe("the codex", () => {
  it("gives every entry exactly one battle that unlocks it", () => {
    const unlockedBy = new Map<string, string[]>();
    for (const s of SCENARIOS) {
      for (const id of s.unlocksCodex) {
        unlockedBy.set(id, [...(unlockedBy.get(id) ?? []), s.id]);
      }
    }
    for (const e of CODEX) {
      const owners = unlockedBy.get(e.id) ?? [];
      strictEqual(owners.length, 1, `"${e.id}" is unlocked by ${owners.length} battles: ${owners.join(", ")}`);
    }
  });

  it("never points a battle at an entry that does not exist", () => {
    for (const s of SCENARIOS) {
      for (const id of s.unlocksCodex) ok(CODEX_BY_ID[id], `${s.id} unlocks a missing "${id}"`);
    }
  });

  it("files every entry under an era that exists", () => {
    const eras = new Set(CAMPAIGNS.map((c) => c.id));
    for (const e of CODEX) {
      const era = CODEX_CAMPAIGN[e.id];
      ok(era, `"${e.id}" belongs to no era, so no screen will show it`);
      ok(eras.has(era), `"${e.id}" is filed under an unknown "${era}"`);
    }
  });

  it("accounts for every entry across the eras, with none left over", () => {
    const counted = CAMPAIGNS.reduce((sum, c) => sum + codexOf(c.id).length, 0);
    strictEqual(counted, CODEX.length, "an entry is in no era's list, or in two");
    for (const c of CAMPAIGNS) ok(codexOf(c.id).length > 0, `${c.id} has no history at all`);
  });

  it("returns an era's entries in the order its battles unlock them", () => {
    for (const c of CAMPAIGNS) {
      const expected = SCENARIOS
        .filter((s) => s.campaignId === c.id)
        .sort((a, b) => a.order - b.order)
        .flatMap((s) => s.unlocksCodex);
      strictEqual(codexOf(c.id).map((e) => e.id).join(","), expected.join(","), c.id);
    }
  });

  it("is written to be checked, not just read", () => {
    for (const e of CODEX) {
      ok(e.body.length >= 2, `"${e.id}" needs more than one paragraph`);
      ok(e.tags.length > 0, `"${e.id}" has no tags`);
      ok(e.era.length > 3, `"${e.id}" does not say when it is about`);
      for (const p of e.body) ok(p.length > 40, `"${e.id}" has a paragraph too short to say anything`);
    }
  });
});

describe("the field manual", () => {
  it("shows every unit the game has, once", () => {
    const listed = ROSTERS.flatMap((r) => Object.keys(r.units));
    strictEqual(new Set(listed).size, listed.length, "a unit is in two rosters");
    strictEqual(listed.length, Object.keys(UNITS).length, "a unit the game has is in no roster the manual shows");
    for (const kind of Object.keys(UNITS)) ok(listed.includes(kind), `${kind} is missing from the manual`);
  });

  it("gives every roster something to say about itself", () => {
    for (const r of ROSTERS) {
      ok(r.title.length > 3, `${r.id} needs a title`);
      ok(r.blurb.length > 30, `${r.id} needs a line explaining what it is`);
      ok(Object.keys(r.units).length > 0, `${r.id} is empty`);
    }
  });

  it("has a printable line for every formation and every kind of ground", () => {
    for (const [id, f] of Object.entries(FORMATIONS)) {
      ok(f.short.length > 10, `${id} has no rules summary`);
      ok(f.history.length > 40, `${id} has no history`);
    }
    for (const [id, t] of Object.entries(TERRAIN)) {
      ok(t.name.length > 3, `${id} has no name`);
      ok(t.blurb.length > 30, `${id} has no description`);
    }
  });
});

describe("the testing unlock", () => {
  it("is off unless it is asked for", () => {
    strictEqual(unlockAll({} as NodeJS.ProcessEnv), false);
    strictEqual(unlockAll({ AQUILA_UNLOCK_ALL: "0" } as NodeJS.ProcessEnv), false);
    strictEqual(unlockAll({ AQUILA_UNLOCK_ALL: "true" } as NodeJS.ProcessEnv), false);
    strictEqual(unlockAll({ AQUILA_UNLOCK_ALL: "1" } as NodeJS.ProcessEnv), true);
  });

  it("keeps a fresh campaign locked down to one battle when it is off", () => {
    const save = freshSave();
    ok(isUnlocked(save, SCENARIOS[0]!.id));
    ok(!isCampaignUnlocked(save, "britannia"));
    strictEqual(SCENARIOS.filter((s) => isUnlocked(save, s.id)).length, 1);
  });

  it("opens everything while it is on, without touching the save", () => {
    process.env.AQUILA_UNLOCK_ALL = "1";
    try {
      const save = freshSave();
      for (const s of SCENARIOS) ok(isUnlocked(save, s.id), `${s.id} should be open`);
      for (const c of CAMPAIGNS) ok(isCampaignUnlocked(save, c.id), `${c.id} should be open`);
      strictEqual(Object.keys(save.scenarios).length, 0, "and nothing was written down");
    } finally {
      delete process.env.AQUILA_UNLOCK_ALL;
    }
  });
});
