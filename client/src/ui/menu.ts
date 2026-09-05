import type { StateResponse } from "../api.js";
import { button, el } from "./dom.js";

/** Campaign screen: the six battles in order, with what each one teaches. */

export interface MenuHandlers {
  onStart: (scenarioId: string) => void;
  onCodex: () => void;
  onRename: () => void;
  onReset: () => void;
}

export function renderMenu(data: StateResponse, h: MenuHandlers): HTMLElement {
  const { save, scenarios } = data;
  const done = scenarios.filter((s) => s.record?.completed).length;

  const cards = scenarios.map((s) => {
    const rec = s.record;
    const status = rec?.completed ? "Victory" : s.unlocked ? (rec ? `${rec.attempts} attempt${rec.attempts === 1 ? "" : "s"}` : "Ready") : "Locked";
    const card = el("div", { class: `scenario-card${s.unlocked ? "" : " locked"}${rec?.completed ? " done" : ""}` },
      el("div", { class: "scenario-order", text: `${s.order}`.padStart(2, "0") }),
      el("div", { class: "scenario-body" },
        el("h3", { text: s.title }),
        el("div", { class: "scenario-meta", text: `${s.year} · ${s.place}` }),
        el("div", { class: "scenario-tactic" }, el("span", { class: "label", text: "Teaches " }), s.tactic),
        el("div", { class: "scenario-status", text: rec ? `${status} · best ${rec.bestPoints} pts` : status }),
      ),
      s.unlocked ? button(rec?.completed ? "Fight again" : "Take command", () => h.onStart(s.id), "btn primary") : null,
    );
    return card;
  });

  return el("section", { class: "menu" },
    el("div", { class: "hero" },
      el("div", { class: "eagle", text: "SPQR" }),
      el("h1", { text: "Aquila" }),
      el("p", { class: "sub", text: "Legions of Trajan · The Dacian Wars, 101 to 106 AD" }),
      el("p", { class: "intro", text: "Six battles. Each one exists to teach a single thing the legion did well. Win, and the history behind the tactic unlocks in the Codex." }),
    ),
    el("div", { class: "commander-row" },
      el("div", { class: "stat" }, el("span", { class: "label", text: "Commander" }), save.commander),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Rank" }), save.rank),
      el("div", { class: "stat" }, el("span", { class: "label", text: "History points" }), String(save.historyPoints)),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Campaign" }), `${done} / ${scenarios.length}`),
      el("div", { class: "stat-actions" },
        button("Codex", h.onCodex),
        button("Rename", h.onRename, "btn quiet"),
        button("Reset", h.onReset, "btn quiet"),
      ),
    ),
    el("div", { class: "scenario-list" }, ...cards),
  );
}
