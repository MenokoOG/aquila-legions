import type { BattleState, BattleUnit } from "../engine/battle.js";
import { unitsOf } from "../engine/battle.js";
import { isDeployed, zone } from "../engine/deployment.js";
import { button, clear, el } from "./dom.js";

/**
 * The deployment panel: the line, and a way to shuffle it that never needs a
 * mouse. Every unit is a row with a step-left and step-right button along the
 * ordered zone, so the whole phase is reachable by Tab and Enter alone; the
 * board still takes clicks for anyone who would rather point at a hex.
 */

export interface DeployHandlers {
  onSelect: (unitId: string) => void;
  onStep: (unitId: string, dir: 1 | -1) => void;
  onCommit: () => void;
}

export function renderDeployPanel(
  root: HTMLElement, s: BattleState, selectedId: string | null, h: DeployHandlers,
): void {
  clear(root);
  const cells = zone(s);
  const units = unitsOf(s, "player");

  const row = (u: BattleUnit): HTMLElement => {
    const line = el("div", { class: `deploy-row${u.id === selectedId ? " selected" : ""}` },
      button(u.label, () => h.onSelect(u.id), "btn quiet deploy-name"),
      el("span", { class: "muted small mono", text: `${u.at.q},${u.at.r}` }),
    );
    const back = button("◀", () => h.onStep(u.id, -1), "btn quiet small");
    back.setAttribute("aria-label", `Move ${u.label} back along the line`);
    const fwd = button("▶", () => h.onStep(u.id, 1), "btn quiet small");
    fwd.setAttribute("aria-label", `Move ${u.label} forward along the line`);
    line.append(el("div", { class: "tip-actions" }, back, fwd));
    return line;
  };

  const ready = isDeployed(s);
  const commit = button("Set the line  ⏎", () => h.onCommit(), "btn primary wide");
  commit.disabled = !ready;

  root.append(el("div", { class: "panel-block deploy" },
    el("h3", { text: "Choose your ground" }),
    el("p", { class: "muted small", text: s.scenario.deployment?.text ?? "" }),
    el("p", { class: "muted small", text: `${cells.length} hexes to stand on, ${units.length} units to place. Click a marked hex, or step a unit along the line with the arrows.` }),
    ...units.map(row),
    commit,
  ));
}
