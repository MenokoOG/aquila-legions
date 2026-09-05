import type { Formation, Hex, Scenario } from "../../../shared/types.js";
import { boardPixelSize, fromPixel, key } from "../hex.js";
import { type BattleState, type BattleUnit, createBattle, toStats, unitAt } from "../engine/battle.js";
import {
  checkOver, endTurn, melee, meleeTargets, moveUnit, pilaTargets, rangedTargets, reachable,
  setFormation, shoot, throwPila,
} from "../engine/rules.js";
import { dacianTurn } from "../engine/ai.js";
import { type Highlights, render, sizeCanvas } from "../render.js";
import { type ActionMode, renderLeftPanel, renderLog } from "./hud.js";
import { el, sleep } from "./dom.js";
import { showModal } from "./modal.js";

/** One battle from deployment to result. Owns the canvas events and the turn loop. */

export interface BattleScreenHandlers {
  onFinished: (state: BattleState) => void;
  onWithdraw: () => void;
}

export function mountBattle(root: HTMLElement, scenario: Scenario, h: BattleScreenHandlers): void {
  const s = createBattle(scenario);
  let selected: BattleUnit | null = null;
  let hoverHex: Hex | null = null;
  let mode: ActionMode = "attack";
  let busy = false;
  let finished = false;

  const left = el("aside", { class: "panel left" });
  const canvas = el("canvas", { class: "board" });
  const boardWrap = el("div", { class: "board-wrap" }, canvas);
  const right = el("aside", { class: "panel right" });
  root.append(el("section", { class: "battle" }, left, boardWrap, right));
  sizeCanvas(canvas, scenario.width, scenario.height);

  function highlights(): Highlights {
    const hl: Highlights = { selected, reachable: new Set(), melee: new Set(), ranged: new Set(), pila: new Set(), hover: hoverHex };
    if (selected && selected.side === "rome" && s.active === "rome" && !busy) {
      for (const k of reachable(s, selected).keys()) hl.reachable.add(k);
      if (mode === "pila") for (const t of pilaTargets(s, selected)) hl.pila.add(key(t.at));
      else {
        for (const t of meleeTargets(s, selected)) hl.melee.add(key(t.at));
        for (const t of rangedTargets(s, selected)) hl.ranged.add(key(t.at));
      }
    }
    return hl;
  }

  function draw(): void {
    if (selected && !s.units.includes(selected)) selected = null;
    const hover = hoverHex ? unitAt(s, hoverHex) ?? null : null;
    render(canvas, s, highlights());
    renderLeftPanel(left, s, { selected, hover, mode, busy }, {
      onFormation: (f: Formation) => { if (selected) { setFormation(s, selected, f); draw(); } },
      onMode: (m) => { mode = m; draw(); },
      onEndTurn: () => { void runDacianTurn(); },
      onRetreat: () => confirmWithdraw(),
      onLesson: () => showLesson(),
    });
    renderLog(right, s);
  }

  function pointToHex(ev: MouseEvent): Hex | null {
    const rect = canvas.getBoundingClientRect();
    const { w } = boardPixelSize(scenario.width, scenario.height);
    const scale = rect.width > 0 ? w / rect.width : 1;
    return fromPixel((ev.clientX - rect.left) * scale, (ev.clientY - rect.top) * scale, scenario.width, scenario.height);
  }

  canvas.addEventListener("mousemove", (ev) => {
    const hx = pointToHex(ev);
    if ((hx && hoverHex && hx.q === hoverHex.q && hx.r === hoverHex.r) || (!hx && !hoverHex)) return;
    hoverHex = hx;
    draw();
  });
  canvas.addEventListener("mouseleave", () => { hoverHex = null; draw(); });

  canvas.addEventListener("click", (ev) => {
    if (busy || s.over || s.active !== "rome") return;
    const hx = pointToHex(ev);
    if (!hx) return;
    const target = unitAt(s, hx);

    if (target && target.side === "rome") {
      selected = target;
      mode = "attack";
      draw();
      return;
    }
    if (!selected) return;

    if (target && target.side === "dacia") {
      if (mode === "pila" && pilaTargets(s, selected).some((t) => t.id === target.id)) throwPila(s, selected, target);
      else if (meleeTargets(s, selected).some((t) => t.id === target.id)) melee(s, selected, target);
      else if (rangedTargets(s, selected).some((t) => t.id === target.id)) shoot(s, selected, target);
      else return;
      mode = "attack";
      checkOver(s);
      draw();
      if (s.over) void finish();
      return;
    }

    if (moveUnit(s, selected, hx)) draw();
  });

  async function runDacianTurn(): Promise<void> {
    if (busy || s.over || s.active !== "rome") return;
    busy = true;
    selected = null;
    endTurn(s);
    draw();
    if (s.over) { busy = false; await finish(); return; }
    await sleep(350);
    for (const unit of dacianTurn(s)) {
      selected = unit;
      draw();
      await sleep(420);
      if (s.over) break;
    }
    selected = null;
    checkOver(s);
    if (!s.over) endTurn(s);
    busy = false;
    draw();
    if (s.over) await finish();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    await sleep(300);
    h.onFinished(s);
  }

  function confirmWithdraw(): void {
    showModal("Withdraw from the field?", el("p", { text: "The battle is recorded as a defeat. Nothing else is lost; you can fight it again." }), [
      { label: "Stay and fight", onClick: () => draw() },
      { label: "Withdraw", onClick: () => { s.over = { won: false, reason: "The legion withdraws in good order." }; h.onFinished(s); }, primary: true },
    ]);
  }

  function showLesson(): void {
    showModal(scenario.title, el("div", {},
      el("p", { class: "muted", text: `${scenario.year} · ${scenario.place}` }),
      el("p", { text: scenario.briefing }),
      el("div", { class: "lesson-box" }, el("h3", { text: `Lesson: ${scenario.tactic}` }), el("p", { text: scenario.lesson })),
      el("h3", { text: "Objectives" }),
      ...scenario.objectives.map((o) => el("div", { class: "objective" }, el("span", { class: "pts", text: `+${o.points}` }), o.text)),
    ), [{ label: "To the field", onClick: () => draw(), primary: true }]);
  }

  draw();
  showLesson();
}

export { toStats };
