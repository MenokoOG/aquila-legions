import { button, clear, el } from "./dom.js";

/**
 * The strip under the board: the threat-layer switch and the key to every colour
 * the board uses. Overlays that need a caption are overlays the player has to guess at.
 */

export interface BoardBarView {
  showThreat: boolean;
  /** How many hexes the enemy currently bears on. Nothing to say when the layer is off. */
  threatened: number;
  /** Timings, when the page was opened with `?perf=1`. Empty otherwise. */
  perf?: string;
}

const KEYS: { swatch: string; text: string }[] = [
  { swatch: "sw-move", text: "Move" },
  { swatch: "sw-melee", text: "Charge target" },
  { swatch: "sw-ranged", text: "Shoot target" },
  { swatch: "sw-pila", text: "Pila target" },
  { swatch: "sw-charge", text: "Enemy can charge here" },
  { swatch: "sw-arrow", text: "Enemy arrows reach here" },
];

export function renderBoardBar(root: HTMLElement, v: BoardBarView, onToggle: () => void): void {
  clear(root);
  const toggle = button(
    `${v.showThreat ? "Hide" : "Show"} enemy reach  T`,
    onToggle,
    `btn form${v.showThreat ? " active" : ""}`,
  );
  toggle.title = "Every hex a Dacian unit could strike on its next turn.";

  root.append(
    toggle,
    v.showThreat
      ? el("span", { class: "muted small", text: `${v.threatened} hexes under threat` })
      : el("span", { class: "muted small", text: "The board is showing no danger." }),
    el("div", { class: "legend" }, ...KEYS.map((k) =>
      el("span", { class: "legend-item" },
        el("span", { class: `swatch ${k.swatch}` }),
        el("span", { text: k.text }),
      ))),
  );
  if (v.perf) root.append(el("span", { class: "muted small perf", text: v.perf }));
}
