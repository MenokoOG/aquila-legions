import type { Formation } from "../../../shared/types.js";
import { FORMATION_INFO } from "../../../shared/data/units.js";
import type { BattleState, BattleUnit } from "../engine/battle.js";
import { terrainAt } from "../engine/battle.js";
import { type Forecast, describeRange } from "../engine/forecast.js";
import { type ObjectiveProgress, allProgress } from "../engine/objectives.js";
import { canChangeFormation, effectiveMove, pilaTargets, underMissileThreat } from "../engine/rules.js";
import { button, clear, el } from "./dom.js";

/** Battle sidebars: briefing, objectives, selected unit, orders, and the log. Pure view over BattleState. */

export type ActionMode = "attack" | "pila";

export interface HudHandlers {
  onFormation: (f: Formation) => void;
  onMode: (m: ActionMode) => void;
  onEndTurn: () => void;
  onUndo: () => void;
  onRestart: () => void;
  onRetreat: () => void;
  onLesson: () => void;
}

export interface HudView {
  selected: BattleUnit | null;
  hover: BattleUnit | null;
  /** What the selected unit would do to the hovered enemy, if anything. */
  forecast: Forecast | null;
  mode: ActionMode;
  busy: boolean;
  canUndo: boolean;
}

const MARK: Record<ObjectiveProgress["status"], string> = { done: "✓", failed: "✗", pending: "·" };

export function renderLeftPanel(root: HTMLElement, s: BattleState, v: HudView, h: HudHandlers): void {
  clear(root);
  const sc = s.scenario;
  const inspector = el("div", { class: "inspect-slot" });

  root.append(
    el("div", { class: "panel-head" },
      el("h2", { text: sc.title }),
      el("div", { class: "muted", text: `${sc.year} · ${sc.place}` }),
    ),
    el("div", { class: "turn-row" },
      el("div", { class: "stat" }, el("span", { class: "label", text: "Turn" }), `${s.turn} / ${sc.maxTurns}`),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Side" }), s.active === "rome" ? "Rome" : "Dacia"),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Teaches" }), sc.tactic),
    ),
    renderObjectives(s),
    button("Read the lesson", h.onLesson, "btn quiet wide"),
    inspector,
  );

  const orders = v.selected && s.active === "rome" && !v.busy ? renderOrders(s, v, h) : null;
  if (orders) root.append(orders);

  root.append(
    el("div", { class: "end-row" },
      button(v.busy ? "The Dacians move..." : "End turn  ⏎", h.onEndTurn, "btn primary wide"),
      el("div", { class: "form-row spread" },
        button("Undo  U", h.onUndo, "btn undo"),
        button("Restart", h.onRestart, "btn quiet"),
        button("Withdraw", h.onRetreat, "btn quiet"),
      ),
      el("div", { class: "muted small keys", text: "Tab next unit · 1-4 formation · P pila · Esc deselect" }),
    ),
  );

  updateInspector(root, s, v);

  const endBtn = root.querySelector<HTMLButtonElement>(".end-row .primary");
  if (endBtn) endBtn.disabled = v.busy || s.active !== "rome" || s.over !== null;
  const undoBtn = root.querySelector<HTMLButtonElement>(".end-row .btn.undo");
  if (undoBtn) undoBtn.disabled = !v.canUndo || v.busy || s.over !== null;
}

/**
 * Redraws only the unit card and the combat forecast. Hovering the board fires
 * constantly, and rebuilding the whole panel each time threw away scroll position
 * and made the sidebar flicker.
 */
export function updateInspector(root: HTMLElement, s: BattleState, v: HudView): void {
  const slot = root.querySelector<HTMLElement>(".inspect-slot");
  if (!slot) return;
  clear(slot);
  const shown = v.selected ?? v.hover;
  slot.append(renderUnitCard(shown, s, shown !== null && shown === v.selected));
  if (v.forecast) slot.append(renderForecast(v.forecast));
}

function renderObjectives(s: BattleState): HTMLElement {
  const rows = allProgress(s).map((p) =>
    el("div", { class: `objective ${p.status}` },
      el("span", { class: "mark-x", text: MARK[p.status] }),
      el("span", { class: "pts", text: `+${p.objective.points}` }),
      el("span", { class: "obj-text", text: p.objective.text }),
      el("span", { class: "obj-detail", text: p.detail }),
    ));
  return el("div", { class: "objectives" }, el("h3", { text: "Objectives" }), ...rows);
}

function renderUnitCard(u: BattleUnit | null, s: BattleState, selected: boolean): HTMLElement {
  if (!u) return el("div", { class: "unit-card empty", text: "Select a unit. Gold hexes are moves; red rings are targets." });
  const t = terrainAt(s, u.at);
  const f = FORMATION_INFO[u.formation];
  const exposed = u.side === "rome" && underMissileThreat(s, u) && u.formation !== "testudo";
  return el("div", { class: `unit-card ${u.side}${selected ? " selected" : ""}` },
    el("div", { class: "unit-name" }, u.label, el("span", { class: "latin", text: ` ${u.tmpl.latin}` })),
    el("div", { class: "unit-men" },
      el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${(100 * u.men) / u.maxMen}%` })),
      `${u.men} / ${u.maxMen} men`,
    ),
    el("div", { class: "unit-stats", text: `Attack ${u.tmpl.attack} · Defense ${u.tmpl.defense} · Move ${effectiveMove(u)}${u.tmpl.range ? ` · Range ${u.tmpl.range}` : ""}${u.pila ? " · Pila ready" : ""}` }),
    el("div", { class: "unit-stats", text: `Formation: ${f?.name ?? u.formation} · Terrain: ${t}` }),
    el("div", { class: "unit-stats", text: `Breaks at ${Math.ceil(u.maxMen * 0.25)} men` }),
    exposed ? el("div", { class: "warn", text: "Under Dacian bow range, out of testudo." }) : null,
    el("p", { class: "blurb", text: u.tmpl.blurb }),
  );
}

function renderForecast(f: Forecast): HTMLElement {
  const verb = f.kind === "pila" ? "Pila volley" : f.kind === "shoot" ? "Volley" : "Charge";
  const outcome = f.breaks === "certain" ? "They break." : f.breaks === "possible" ? "They may break." : null;
  return el("div", { class: `forecast${f.risky ? " risky" : ""}` },
    el("h3", { text: `${verb} forecast` }),
    el("div", { class: "fc-row" },
      el("span", { class: "label", text: "They lose" }),
      el("span", { class: "fc-num", text: `${describeRange(f.dealt)} men` }),
    ),
    f.taken
      ? el("div", { class: "fc-row" },
        el("span", { class: "label", text: "You lose" }),
        el("span", { class: "fc-num", text: `${describeRange(f.taken)} men` }),
      )
      : el("div", { class: "muted small", text: "No retaliation." }),
    outcome ? el("div", { class: "fc-note", text: outcome }) : null,
    f.risky ? el("div", { class: "fc-note warn", text: "This cohort could break in the counter-attack." }) : null,
  );
}

function renderOrders(s: BattleState, v: HudView, h: HudHandlers): HTMLElement {
  const u = v.selected!;
  const forms: Formation[] = ["line", "testudo", "cuneus", "orbis"];
  const canForm = canChangeFormation(u);
  const hasPila = pilaTargets(s, u).length > 0;

  const formButtons = u.tmpl.canFormation
    ? el("div", { class: "order-group" },
      el("h3", { text: canForm ? "Formation" : "Formation (set before moving)" }),
      el("div", { class: "form-row" }, ...forms.map((f, i) => {
        const info = FORMATION_INFO[f]!;
        const b = button(`${info.name}  ${i + 1}`, () => h.onFormation(f), `btn form${u.formation === f ? " active" : ""}`);
        b.title = info.short;
        b.disabled = !canForm && u.formation !== f;
        return b;
      })),
      el("div", { class: "muted small", text: FORMATION_INFO[u.formation]?.short ?? "" }),
    )
    : null;

  const modeButtons = u.tmpl.range === 0
    ? el("div", { class: "order-group" },
      el("h3", { text: "Then click an enemy to" }),
      el("div", { class: "form-row" },
        button("Attack (gladius)  A", () => h.onMode("attack"), `btn form${v.mode === "attack" ? " active" : ""}`),
        hasPila ? button("Throw pila  P", () => h.onMode("pila"), `btn form${v.mode === "pila" ? " active" : ""}`) : null,
      ),
    )
    : el("div", { class: "order-group" }, el("h3", { text: "Click an enemy in range to shoot" }));

  return el("div", { class: "orders" }, formButtons, modeButtons);
}

export function renderLog(root: HTMLElement, s: BattleState): void {
  // The log only ever grows, so skip the rebuild when nothing has been added.
  if (root.dataset.lines === String(s.log.length)) return;
  root.dataset.lines = String(s.log.length);
  clear(root);
  root.append(el("h3", { text: "Dispatches" }));
  const list = el("div", { class: "log-list" });
  for (const line of s.log.slice().reverse()) {
    list.append(el("div", { class: `log-line ${line.side}` }, el("span", { class: "log-turn", text: `T${line.turn}` }), line.text));
  }
  root.append(list);
}
