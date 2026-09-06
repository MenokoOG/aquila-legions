import type { BattleState } from "../engine/battle.js";
import { type Tip, advise } from "../advisor/tips.js";
import { button, clear, el } from "./dom.js";

/**
 * The Praefectus panel: the two or three things an officer at your shoulder
 * would mention, and a way to keep one.
 *
 * Deliberately short. A list of nine things is a list nobody reads, and the
 * adviser is meant to be glanceable between orders rather than studied.
 *
 * The tips below are the panel. If counsel is configured, a button asks a model
 * to say the most important of them in the prefect's own voice — the local
 * sentences are what render first and what stay if it never answers, which is
 * the whole arrangement: the facts are ours, only the phrasing is his.
 */

const SHOWN = 3;

/** What the prefect said, if he has been asked this turn. */
export interface Counsel {
  state: "idle" | "asking" | "said" | "silent";
  text: string;
}

export interface AdvisorHandlers {
  /** Select the unit a tip is about. */
  onFocus: (unitId: string) => void;
  /** File the tip in the Commentarii. */
  onKeep: (tip: Tip) => void;
  /** Ask for the prefect's phrasing of this turn's tips. Absent when unconfigured. */
  onAsk?: (facts: string[]) => void;
  /** File the prefect's words in the Commentarii. */
  onKeepCounsel?: (text: string) => void;
  /** Ids already filed, so a kept tip stops offering to be kept again. */
  kept: ReadonlySet<string>;
  counsel: Counsel;
}

function counselBlock(c: Counsel, h: AdvisorHandlers): HTMLElement | null {
  if (c.state === "idle") return null;
  if (c.state === "asking") {
    return el("div", { class: "counsel waiting" }, el("p", { class: "muted small", text: "The Praefectus is thinking…" }));
  }
  if (c.state === "silent") {
    return el("div", { class: "counsel" }, el("p", { class: "muted small", text: "No word from the Praefectus. His officers stand by what they told you." }));
  }
  const block = el("div", { class: "counsel said" },
    // `text` sets textContent. Model output is never given to innerHTML.
    el("p", { text: c.text }),
  );
  if (h.onKeepCounsel) {
    block.append(el("div", { class: "tip-actions" },
      button("Keep", () => h.onKeepCounsel?.(c.text), "btn quiet small")));
  }
  return block;
}

export function renderAdvisor(root: HTMLElement, s: BattleState, h: AdvisorHandlers): void {
  const slot = root.querySelector<HTMLElement>(".advisor-slot");
  if (!slot) return;
  clear(slot);

  const tips = advise(s).slice(0, SHOWN);
  if (!tips.length) return;

  const rows = tips.map((t) => {
    const line = el("div", { class: "tip" }, el("p", { text: t.text }));
    const actions = el("div", { class: "tip-actions" });
    if (t.unitId) {
      actions.append(button("Show me", () => h.onFocus(t.unitId!), "btn quiet small"));
    }
    const keepId = `tip:${s.scenario.id}:${t.id}`;
    if (h.kept.has(keepId)) {
      actions.append(el("span", { class: "muted small", text: "Kept" }));
    } else {
      actions.append(button("Keep", () => h.onKeep(t), "btn quiet small"));
    }
    line.append(actions);
    return line;
  });

  const panel = el("div", { class: "panel-block advisor" },
    el("h3", { text: "The Praefectus" }),
    ...rows,
  );

  const said = counselBlock(h.counsel, h);
  if (said) panel.append(said);

  if (h.onAsk && h.counsel.state !== "asking") {
    const ask = button(
      h.counsel.state === "idle" ? "Ask the Praefectus" : "Ask again",
      () => h.onAsk?.(tips.map((t) => t.text)),
      "btn quiet wide small",
    );
    ask.title = "Sends this turn's advice to be put in his own words. Nothing else about your game is sent.";
    panel.append(ask);
  }

  slot.append(panel);
}
