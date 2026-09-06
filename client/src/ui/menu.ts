import type { CampaignView, ScenarioSummary, StateResponse } from "../api.js";
import { button, clear, el } from "./dom.js";

/** Campaign screen: the eras, and the battles of whichever one you are looking at. */

export interface MenuHandlers {
  onStart: (scenarioId: string) => void;
  onCodex: () => void;
  onCommentarii: () => void;
  onRename: () => void;
  onReset: () => void;
}

function scenarioCard(s: ScenarioSummary, h: MenuHandlers): HTMLElement {
  const rec = s.record;
  const status = rec?.completed
    ? "Victory"
    : s.unlocked ? (rec ? `${rec.attempts} attempt${rec.attempts === 1 ? "" : "s"}` : "Ready") : "Locked";
  return el("div", { class: `scenario-card${s.unlocked ? "" : " locked"}${rec?.completed ? " done" : ""}` },
    el("div", { class: "scenario-order", text: `${s.order}`.padStart(2, "0") }),
    el("div", { class: "scenario-body" },
      el("h3", { text: s.title }),
      el("div", { class: "scenario-meta", text: `${s.year} · ${s.place}` }),
      el("div", { class: "scenario-tactic" }, el("span", { class: "label", text: "Teaches " }), s.tactic),
      el("div", { class: "scenario-status", text: rec ? `${status} · best ${rec.bestPoints} pts` : status }),
    ),
    s.unlocked ? button(rec?.completed ? "Fight again" : "Take command", () => h.onStart(s.id), "btn primary") : null,
  );
}

export function renderMenu(data: StateResponse, h: MenuHandlers): HTMLElement {
  const { save, scenarios } = data;
  const campaigns = [...data.campaigns].sort((a, b) => a.order - b.order);

  // Open on the era you are in the middle of: the last one unlocked.
  let current = campaigns.filter((c) => c.unlocked !== false).at(-1) ?? campaigns[0];

  const hero = el("div", { class: "hero" });
  const tabs = el("div", { class: "campaign-tabs" });
  const note = el("div", { class: "campaign-note" });
  const commander = el("div", { class: "commander-row" });
  const list = el("div", { class: "scenario-list" });

  function battlesOf(c: CampaignView | undefined): ScenarioSummary[] {
    return c ? scenarios.filter((s) => s.campaignId === c.id).sort((a, b) => a.order - b.order) : [];
  }

  /** What has to happen before a locked era opens, in a sentence. */
  function requirement(c: CampaignView): string {
    const before = campaigns.find((x) => x.order === c.order - 1);
    if (!before) return `${c.title} is not open yet.`;
    const last = battlesOf(before).at(-1);
    return last
      ? `${c.title} opens when you win ${last.title}, the last battle of ${before.title}.`
      : `${c.title} opens when you finish ${before.title}.`;
  }

  function drawTabs(): void {
    clear(tabs);
    for (const c of campaigns) {
      const open = c.unlocked !== false;
      const b = button(
        open ? c.title : `${c.title} · locked`,
        () => {
          // A locked era is still worth reading about, and still worth being
          // told why it is shut. It is left focusable and clickable and says so,
          // rather than being a dead control nobody can interrogate.
          if (open) { current = c; clear(note); drawTabs(); drawBody(); }
          else { clear(note); note.append(el("p", { class: "muted small", text: requirement(c) })); }
        },
        `btn chip${c.id === current?.id ? " active" : ""}${open ? "" : " locked"}`,
      );
      b.setAttribute("aria-pressed", String(c.id === current?.id));
      if (!open) {
        b.setAttribute("aria-disabled", "true");
        b.title = requirement(c);
      }
      tabs.append(b);
    }
  }

  function drawBody(): void {
    const battles = battlesOf(current);
    const done = battles.filter((s) => s.record?.completed).length;

    clear(hero);
    hero.append(
      el("div", { class: "eagle", text: "SPQR" }),
      el("h1", { text: "Aquila" }),
      el("p", { class: "sub", text: current ? `${current.title} · ${current.subtitle}` : "" }),
      el("p", { class: "intro", text: current?.blurb ?? "" }),
    );

    // Its own row above the grid, not a cell inside it: it is a flex row whose
    // buttons push right, and in a 360px grid cell the last of them is cut off.
    clear(commander);
    commander.append(
      el("div", { class: "stat" }, el("span", { class: "label", text: "Commander" }), save.commander),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Rank" }), save.rank),
      el("div", { class: "stat" }, el("span", { class: "label", text: "History points" }), String(save.historyPoints)),
      el("div", { class: "stat" }, el("span", { class: "label", text: "This era" }), `${done} / ${battles.length}`),
      el("div", { class: "stat-actions" },
        button("Codex", h.onCodex),
        button("Commentarii", h.onCommentarii),
        button("Rename", h.onRename, "btn quiet"),
        button("Reset", h.onReset, "btn quiet"),
      ),
    );

    clear(list);
    list.append(...battles.map((s) => scenarioCard(s, h)));
  }

  drawTabs();
  drawBody();
  return el("section", { class: "menu" }, hero, tabs, note, commander, list);
}
