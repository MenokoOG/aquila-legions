import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX_BY_ID } from "../shared/data/codex.js";
import { SCENARIOS, scenariosOf } from "../shared/data/scenarios.js";
import { createBattle } from "../client/src/engine/battle.js";
import { freshSave, isCampaignUnlocked, isUnlocked } from "../server/progress.js";

describe("the Judaea campaign", () => {
  const JUDAEA = scenariosOf("judaea");

  it("ships five battles in order, each teaching something named", () => {
    strictEqual(JUDAEA.length, 5);
    JUDAEA.forEach((s, i) => {
      strictEqual(s.order, i + 1, `${s.id} is out of order`);
      ok(s.tactic.length > 4 && s.lesson.length > 80 && s.briefing.length > 80, `${s.id} is thin`);
      ok(s.unlocksCodex.length > 0, `${s.id} unlocks no history`);
      for (const id of s.unlocksCodex) ok(CODEX_BY_ID[id], `${s.id} unlocks a missing entry "${id}"`);
    });
  });

  it("is the third era and opens only after Britannia is finished", () => {
    strictEqual(CAMPAIGNS.find((c) => c.id === "judaea")!.order, 3);
    const save = freshSave();
    ok(!isCampaignUnlocked(save, "judaea"));
    const lastBritish = scenariosOf("britannia").at(-1)!;
    save.scenarios[lastBritish.id] = { completed: true, bestPoints: 1, attempts: 1, objectivesMet: [] };
    ok(isCampaignUnlocked(save, "judaea"));
    ok(isUnlocked(save, "jotapata"));
    ok(!isUnlocked(save, "gamla"));
  });

  it("builds every battle on the right campaign", () => {
    for (const s of JUDAEA) strictEqual(createBattle(s).campaign.id, "judaea");
    ok(SCENARIOS.length >= 17);
  });
});
