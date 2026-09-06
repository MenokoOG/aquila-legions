import type { BattleState } from "../engine/battle.js";
import { type Tip, advise } from "../advisor/tips.js";
import { button, clear, el } from "./dom.js";

/**
 * The Praefectus panel: the two or three things an officer at your shoulder
 * would mention, and a way to keep one.
 *
 * Deliberately short. A list of nine things is a list nobody reads, and the
 * adviser is meant to be glanceable between orders rather than studied.
 */

const SHOWN = 3;

export interface AdvisorHandlers {
  /** Select the unit a tip is about. */
  onFocus: (unitId: string) => void;
  /** File the tip in the Commentarii. */
  onKeep: (tip: Tip) => void;
  /** Ids already filed, so a kept tip stops offering to be kept again. */
  kept: ReadonlySet<string>;
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

  slot.append(el("div", { class: "panel-block advisor" },
    el("h3", { text: "The Praefectus" }),
    ...rows,
  ));
}
