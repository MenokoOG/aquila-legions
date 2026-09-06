import type { Formation } from "../../../shared/types.js";
import { FORMATIONS, formationsFor } from "../../../shared/data/formations.js";
import type { BattleState, BattleUnit } from "../engine/battle.js";
import { faction, terrainAt } from "../engine/battle.js";
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

/** Who bears on the hex the player is looking at, ready to be read out in a sentence. */
export interface DangerView {
  /** Names the hex: "This hex" when hovering empty ground, the unit's label otherwise. */
  subject: string;
  melee: string[];
  missile: string[];
}

export interface HudView {
  selected: BattleUnit | null;
  hover: BattleUnit | null;
  /** What the selected unit would do to the hovered enemy, if anything. */
  forecast: Forecast | null;
  /** What the enemy could do to the hex under the cursor. Null when the layer is off. */
  danger: DangerView | null;
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
      el("div", { class: "stat" }, el("span", { class: "label", text: "Side" }), faction(s, s.active).name),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Teaches" }), sc.tactic),
    ),
    inspector,
  );

  const orders = v.selected && s.active === "player" && !v.busy ? renderOrders(s, v, h) : null;
  if (orders) root.append(orders);

  // The forecast sits below the orders, not above them: you pick the formation and
  // the weapon first, and the numbers answer the choice you just made.
  root.append(el("div", { class: "forecast-slot" }));

  root.append(
    el("div", { class: "end-row" },
      button(v.busy ? `${faction(s, "enemy").plural} move...` : "End turn  ⏎", h.onEndTurn, "btn primary wide"),
      el("div", { class: "form-row spread" },
        button("Undo  U", h.onUndo, "btn undo"),
        button("Restart", h.onRestart, "btn quiet"),
        button("Withdraw", h.onRetreat, "btn quiet"),
      ),
      el("div", { class: "muted small keys", text: "Tab next unit · 1-4 formation · P pila · T enemy reach · Esc deselect" }),
    ),
    button("Read the lesson", h.onLesson, "btn quiet wide"),
  );

  updateInspector(root, s, v);

  const endBtn = root.querySelector<HTMLButtonElement>(".end-row .primary");
  if (endBtn) endBtn.disabled = v.busy || s.active !== "player" || s.over !== null;
  const undoBtn = root.querySelector<HTMLButtonElement>(".end-row .btn.undo");
  if (undoBtn) undoBtn.disabled = !v.canUndo || v.busy || s.over !== null;
}

/**
 * The reading panel: what you are trying to achieve, what is aimed at you, and what
 * has happened. The left panel gives orders; this one is the answer to "why".
 *
 * The log keeps its own container because it only ever grows, and rebuilding it on
 * every hover threw away the scroll position.
 */
export function renderRightPanel(root: HTMLElement, s: BattleState, v: HudView): void {
  // Built once and then kept. Replacing the log's container every order would hand
  // renderLog a fresh element each time, and its "only redraw when a line arrived"
  // check reads a dataset flag off that element.
  let objectives = root.querySelector<HTMLElement>(".objectives-slot");
  if (!objectives) {
    clear(root);
    objectives = el("div", { class: "objectives-slot" });
    root.append(
      el("div", { class: "advisor-slot" }),
      objectives,
      el("div", { class: "danger-slot" }),
      el("div", { class: "log-slot" }),
    );
  }
  clear(objectives);
  objectives.append(renderObjectives(s));
  updateDanger(root, v);
  renderLog(root.querySelector<HTMLElement>(".log-slot")!, s);
}

/**
 * Redraws only the unit card and the combat forecast. Hovering the board fires
 * constantly, and rebuilding the whole panel each time threw away scroll position
 * and made the sidebar flicker.
 */
export function updateInspector(root: HTMLElement, s: BattleState, v: HudView): void {
  const slot = root.querySelector<HTMLElement>(".inspect-slot");
  if (slot) {
    clear(slot);
    const shown = v.selected ?? v.hover;
    slot.append(renderUnitCard(shown, s, shown !== null && shown === v.selected));
  }
  const fc = root.querySelector<HTMLElement>(".forecast-slot");
  if (fc) {
    clear(fc);
    if (v.forecast) fc.append(renderForecast(v.forecast));
  }
}

/** The threat readout, which follows the cursor and so redraws on its own. */
export function updateDanger(root: HTMLElement, v: HudView): void {
  const slot = root.querySelector<HTMLElement>(".danger-slot");
  if (!slot) return;
  clear(slot);
  const danger = v.danger ? renderDanger(v.danger) : null;
  if (danger) slot.append(danger);
}

/** Counts one kind of attacker into plain English: "2 Dacian Warbands, Falxmen". */
function nameList(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const l of labels) counts.set(l, (counts.get(l) ?? 0) + 1);
  return [...counts].map(([l, n]) => (n > 1 ? `${n} ${l}` : l)).join(", ");
}

function renderDanger(d: DangerView): HTMLElement | null {
  if (!d.melee.length && !d.missile.length) return null;
  return el("div", { class: "danger" },
    el("h3", { text: `${d.subject} — under threat` }),
    d.melee.length
      ? el("div", { class: "danger-row" },
        el("span", { class: "swatch sw-charge" }),
        el("span", { text: `Charged by ${nameList(d.melee)}` }))
      : null,
    d.missile.length
      ? el("div", { class: "danger-row" },
        el("span", { class: "swatch sw-arrow" }),
        el("span", { text: `Shot at by ${nameList(d.missile)}` }))
      : null,
  );
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
  const f = FORMATIONS[u.formation];
  const exposed = u.side === "player" && underMissileThreat(s, u) && u.formation !== "testudo";
  return el("div", { class: `unit-card ${u.side}${selected ? " selected" : ""}` },
    el("div", { class: "unit-name" }, u.label, el("span", { class: "latin", text: ` ${u.tmpl.latin}` })),
    el("div", { class: "unit-men" },
      el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${(100 * u.men) / u.maxMen}%` })),
      `${u.men} / ${u.maxMen} men`,
    ),
    el("div", { class: "unit-stats", text: `Attack ${u.tmpl.attack} · Defense ${u.tmpl.defense} · Move ${effectiveMove(u)}${u.tmpl.range ? ` · Range ${u.tmpl.range}` : ""}${u.pila ? " · Pila ready" : ""}` }),
    el("div", { class: "unit-stats", text: `Formation: ${f.name} · Terrain: ${t}` }),
    el("div", { class: "unit-stats", text: `Breaks at ${Math.ceil(u.maxMen * 0.25)} men` }),
    exposed ? el("div", { class: "warn", text: `Under ${faction(s, "enemy").adjective} bow range, out of testudo.` }) : null,
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
  const forms = formationsFor(s.scenario.formations);
  const canForm = canChangeFormation(u);
  const hasPila = pilaTargets(s, u).length > 0;

  const formButtons = u.tmpl.canFormation
    ? el("div", { class: "order-group" },
      el("h3", { text: canForm ? "Formation" : "Formation (set before moving)" }),
      el("div", { class: "form-row" }, ...forms.map((f, i) => {
        const info = FORMATIONS[f];
        const b = button(`${info.name}  ${i + 1}`, () => h.onFormation(f), `btn form${u.formation === f ? " active" : ""}`);
        b.title = info.short;
        b.disabled = !canForm && u.formation !== f;
        return b;
      })),
      el("div", { class: "muted small", text: FORMATIONS[u.formation].short }),
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
