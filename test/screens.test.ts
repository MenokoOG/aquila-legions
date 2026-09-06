import { ok, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import type { CampaignView, ScenarioSummary, StateResponse } from "../client/src/api.js";
import type { CodexEntry } from "../shared/types.js";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { CODEX } from "../shared/data/codex.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import {
  type StubNode, buttonNamed, findAll, hasClass, installDom, isInside, textOf,
} from "./dom-stub.js";

installDom();

const { renderMenu } = await import("../client/src/ui/menu.js");
const { renderCodex } = await import("../client/src/ui/codex.js");

/**
 * The screens, built and walked.
 *
 * Both bugs these cover shipped: the Reset button was moved into a grid cell
 * and clipped, and a locked campaign tab was dimmed to roughly nothing on a
 * near-black ground so it read as absent. Neither is a type error and neither
 * was reachable by any test, which is why they reached a screenshot.
 */

const NOOP = {
  onStart: () => {}, onCodex: () => {}, onCommentarii: () => {},
  onRename: () => {}, onReset: () => {}, onBack: () => {},
};

function summaries(unlockedIds: string[]): ScenarioSummary[] {
  return SCENARIOS.map((s) => ({
    id: s.id, campaignId: s.campaignId, order: s.order, title: s.title, year: s.year,
    place: s.place, tactic: s.tactic,
    unlocked: unlockedIds.includes(s.id),
    record: null,
  }));
}

function state(over: Partial<StateResponse> = {}): StateResponse {
  const campaigns: CampaignView[] = CAMPAIGNS.map((c) => ({ ...c, unlocked: c.order === 1 }));
  return {
    save: {
      version: 2, commander: "Legatus", historyPoints: 0, rank: "Tiro (Recruit)",
      scenarios: {}, codexUnlocked: [], commentarii: [], battles: 0, updatedAt: "",
    },
    campaigns,
    scenarios: summaries(["castra"]),
    ...over,
  };
}

describe("the campaign screen", () => {
  it("keeps the commander row and its buttons out of the battle grid", () => {
    const menu = renderMenu(state(), NOOP) as unknown as StubNode;
    const reset = buttonNamed(menu, "Reset");
    ok(reset, "the Reset button is not on the screen at all");
    ok(!isInside(reset, "scenario-list"),
      "the commander row is inside the battle grid again, which clips its last button");
    for (const label of ["Codex", "Commentarii", "Rename", "Reset"]) {
      const b = buttonNamed(menu, label);
      ok(b, `${label} is missing`);
      ok(isInside(b, "commander-row"), `${label} escaped the commander row`);
    }
  });

  it("shows every era, including the ones still shut", () => {
    const menu = renderMenu(state(), NOOP) as unknown as StubNode;
    const tabs = findAll(menu, (n) => hasClass(n, "chip"));
    strictEqual(tabs.length, CAMPAIGNS.length, "an era is missing from the tab row");
    for (const c of CAMPAIGNS) {
      ok(tabs.some((t) => textOf(t).includes(c.title)), `${c.title} has no tab`);
    }
  });

  it("marks a shut era as shut rather than hiding or disabling it", () => {
    const menu = renderMenu(state(), NOOP) as unknown as StubNode;
    const locked = findAll(menu, (n) => hasClass(n, "chip") && hasClass(n, "locked"));
    strictEqual(locked.length, 1, "exactly one era should be shut on a fresh save");
    const tab = locked[0]!;
    ok(textOf(tab).includes("locked"), "it has to say so in words, not only in colour");
    strictEqual(tab.disabled, false, "a disabled tab cannot be focused, so nobody can ask why it is shut");
    strictEqual(tab.getAttribute("aria-disabled"), "true");
    ok(tab.title.length > 20, "and it has to say what would open it");
  });

  it("says what opens a shut era when you click it, and does not switch to it", () => {
    const menu = renderMenu(state(), NOOP) as unknown as StubNode;
    const locked = findAll(menu, (n) => hasClass(n, "chip") && hasClass(n, "locked"))[0]!;
    const before = textOf(menu);
    locked.click();
    const note = findAll(menu, (n) => hasClass(n, "campaign-note"))[0]!;
    ok(textOf(note).length > 20, "clicking a locked era should explain itself");
    ok(before.includes(CAMPAIGNS[0]!.subtitle), "and the open era is still the one being shown");
  });

  it("lists only the battles of the era being shown", () => {
    const menu = renderMenu(state(), NOOP) as unknown as StubNode;
    const cards = findAll(menu, (n) => hasClass(n, "scenario-card"));
    const dacian = SCENARIOS.filter((s) => s.campaignId === CAMPAIGNS[0]!.id);
    strictEqual(cards.length, dacian.length);
  });

  it("switches the whole screen when an open era is chosen", () => {
    const both: CampaignView[] = CAMPAIGNS.map((c) => ({ ...c, unlocked: true }));
    const menu = renderMenu(state({ campaigns: both }), NOOP) as unknown as StubNode;
    // It opens on the last unlocked era, so the second one's battles are shown.
    const second = CAMPAIGNS[1]!;
    ok(textOf(menu).includes(second.subtitle), "it should open on the era you are furthest into");
    const firstTab = findAll(menu, (n) => hasClass(n, "chip"))[0]!;
    firstTab.click();
    ok(textOf(menu).includes(CAMPAIGNS[0]!.subtitle), "choosing an era should redraw the hero");
    const cards = findAll(menu, (n) => hasClass(n, "scenario-card"));
    strictEqual(cards.length, SCENARIOS.filter((s) => s.campaignId === CAMPAIGNS[0]!.id).length);
  });
});

describe("the codex screen", () => {
  const entries = CODEX.map((e: CodexEntry) => ({ ...e, unlocked: false }));

  it("groups history by era instead of one flat wall of cards", () => {
    const codex = renderCodex(entries, NOOP.onBack) as unknown as StubNode;
    const sections = findAll(codex, (n) => hasClass(n, "codex-section"));
    ok(sections.length >= CAMPAIGNS.length + 3, `only ${sections.length} sections; history and the manual should both be split`);
    for (const c of CAMPAIGNS) {
      ok(sections.some((s) => textOf(s).includes(c.title)), `${c.title} has no section`);
    }
  });

  it("offers a filter chip per era, and one for everything", () => {
    const codex = renderCodex(entries, NOOP.onBack) as unknown as StubNode;
    const chips = findAll(codex, (n) => hasClass(n, "chip"));
    strictEqual(chips.length, CAMPAIGNS.length + 1);
    ok(textOf(chips[0]!).includes("Everything"));
  });

  it("narrows to one era when its chip is chosen, and keeps the legion on show", () => {
    const codex = renderCodex(entries, NOOP.onBack) as unknown as StubNode;
    const chips = findAll(codex, (n) => hasClass(n, "chip"));
    chips[2]!.click(); // the second era

    const shown = textOf(codex);
    ok(shown.includes(CAMPAIGNS[1]!.title), "the chosen era is shown");
    const sections = findAll(codex, (n) => hasClass(n, "codex-section"))
      .map((s) => textOf(s));
    ok(!sections.some((t) => t.includes(CAMPAIGNS[0]!.subtitle)), "the other era's history is hidden");
    ok(shown.includes("The Legion"), "but the legion is in every era and stays on show");
  });

  it("keeps the whole field manual open, because it is rules and not history", () => {
    const codex = renderCodex(entries, NOOP.onBack) as unknown as StubNode;
    const shown = textOf(codex);
    for (const word of ["Formations", "Ground", "Tortoise", "Marsh"]) {
      ok(shown.includes(word), `the manual should show ${word} whether or not anything is unlocked`);
    }
  });

  it("does not print a locked entry's contents", () => {
    const codex = renderCodex(entries, NOOP.onBack) as unknown as StubNode;
    const locked = findAll(codex, (n) => hasClass(n, "codex-entry") && hasClass(n, "locked"));
    strictEqual(locked.length, CODEX.length, "nothing is unlocked, so every entry should be shut");
    const body = CODEX[0]!.body[0]!;
    ok(!textOf(codex).includes(body), "a locked entry gave away its own text");
  });

  it("prints an unlocked entry in full", () => {
    const one = CODEX[0]!;
    const codex = renderCodex(
      entries.map((e) => (e.id === one.id ? { ...e, unlocked: true } : e)), NOOP.onBack,
    ) as unknown as StubNode;
    ok(textOf(codex).includes(one.body[0]!), "an unlocked entry should be readable");
  });
});
