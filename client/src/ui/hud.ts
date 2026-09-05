import type { Formation } from "../../../shared/types.js";
import { FORMATION_INFO } from "../../../shared/data/units.js";
import type { BattleState, BattleUnit } from "../engine/battle.js";
import { terrainAt } from "../engine/battle.js";
import { canChangeFormation, effectiveMove, pilaTargets } from "../engine/rules.js";
import { button, clear, el } from "./dom.js";

/** Battle sidebars: briefing, selected unit, orders, and the log. Pure view over BattleState. */

export type ActionMode = "attack" | "pila";

export interface HudHandlers {
  onFormation: (f: Formation) => void;
  onMode: (m: ActionMode) => void;
  onEndTurn: () => void;
  onRetreat: () => void;
  onLesson: () => void;
}

export interface HudView {
  selected: BattleUnit | null;
  hover: BattleUnit | null;
  mode: ActionMode;
  busy: boolean;
}

export function renderLeftPanel(root: HTMLElement, s: BattleState, v: HudView, h: HudHandlers): void {
  clear(root);
  const sc = s.scenario;
  const parts: (HTMLElement | null)[] = [
    el("div", { class: "panel-head" },
      el("h2", { text: sc.title }),
      el("div", { class: "muted", text: `${sc.year} · ${sc.place}` }),
    ),
    el("div", { class: "turn-row" },
      el("div", { class: "stat" }, el("span", { class: "label", text: "Turn" }), `${s.turn} / ${sc.maxTurns}`),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Side" }), s.active === "rome" ? "Rome" : "Dacia"),
      el("div", { class: "stat" }, el("span", { class: "label", text: "Teaches" }), sc.tactic),
    ),
    el("div", { class: "objectives" },
      el("h3", { text: "Objectives" }),
      ...sc.objectives.map((o) => el("div", { class: "objective" }, el("span", { class: "pts", text: `+${o.points}` }), o.text)),
    ),
    button("Read the lesson", h.onLesson, "btn quiet wide"),
    renderUnitCard(v.selected ?? v.hover, s, v.selected !== null && v.selected === (v.selected ?? v.hover)),
    v.selected && s.active === "rome" && !v.busy ? renderOrders(s, v, h) : null,
    el("div", { class: "end-row" },
      button(v.busy ? "The Dacians move..." : "End turn", h.onEndTurn, "btn primary wide"),
      button("Withdraw", h.onRetreat, "btn quiet wide"),
    ),
  ];
  root.append(...parts.filter((p): p is HTMLElement => p !== null));
  const endBtn = root.querySelector<HTMLButtonElement>(".end-row .primary");
  if (endBtn) endBtn.disabled = v.busy || s.active !== "rome" || s.over !== null;
}

function renderUnitCard(u: BattleUnit | null, s: BattleState, selected: boolean): HTMLElement {
  if (!u) return el("div", { class: "unit-card empty", text: "Select a unit. Gold hexes are moves; red rings are targets." });
  const t = terrainAt(s, u.at);
  const f = FORMATION_INFO[u.formation];
  return el("div", { class: `unit-card ${u.side}${selected ? " selected" : ""}` },
    el("div", { class: "unit-name" }, u.label, el("span", { class: "latin", text: ` ${u.tmpl.latin}` })),
    el("div", { class: "unit-men" },
      el("div", { class: "bar" }, el("div", { class: "fill", style: `width:${(100 * u.men) / u.maxMen}%` })),
      `${u.men} / ${u.maxMen} men`,
    ),
    el("div", { class: "unit-stats", text: `Attack ${u.tmpl.attack} · Defense ${u.tmpl.defense} · Move ${effectiveMove(u)}${u.tmpl.range ? ` · Range ${u.tmpl.range}` : ""}${u.pila ? " · Pila ready" : ""}` }),
    el("div", { class: "unit-stats", text: `Formation: ${f?.name ?? u.formation} · Terrain: ${t}` }),
    el("p", { class: "blurb", text: u.tmpl.blurb }),
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
      el("div", { class: "form-row" }, ...forms.map((f) => {
        const info = FORMATION_INFO[f]!;
        const b = button(info.name, () => h.onFormation(f), `btn form${u.formation === f ? " active" : ""}`);
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
        button("Attack (gladius)", () => h.onMode("attack"), `btn form${v.mode === "attack" ? " active" : ""}`),
        hasPila ? button("Throw pila", () => h.onMode("pila"), `btn form${v.mode === "pila" ? " active" : ""}`) : null,
      ),
    )
    : el("div", { class: "order-group" }, el("h3", { text: "Click an enemy in range to shoot" }));

  return el("div", { class: "orders" }, formButtons, modeButtons);
}

export function renderLog(root: HTMLElement, s: BattleState): void {
  clear(root);
  root.append(el("h3", { text: "Dispatches" }));
  const list = el("div", { class: "log-list" });
  for (const line of s.log.slice().reverse()) {
    list.append(el("div", { class: `log-line ${line.side}` }, el("span", { class: "log-turn", text: `T${line.turn}` }), line.text));
  }
  root.append(list);
}
