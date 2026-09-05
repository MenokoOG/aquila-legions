import type { Formation, Hex, Scenario } from "../../../shared/types.js";
import { FORMATION_ORDER } from "../../../shared/data/formations.js";
import { boardPixelSize, fromPixel, key } from "../hex.js";
import {
  type BattleState, type BattleUnit, cloneBattle, createBattle, toStats, unitAt,
} from "../engine/battle.js";
import {
  checkOver, endTurn, melee, meleeTargets, moveUnit, pathTo, pilaTargets, rangedTargets,
  reachable, setFormation, shoot, throwPila,
} from "../engine/rules.js";
import { type Forecast, forecast } from "../engine/forecast.js";
import { type ThreatMap, threatAt, threatMap } from "../engine/threat.js";
import { enemyTurn } from "../engine/ai.js";
import { Effects } from "../effects.js";
import { type Highlights, render, sizeCanvas } from "../render.js";
import { type ActionMode, type DangerView, renderLeftPanel, renderLog, updateInspector } from "./hud.js";
import { renderBoardBar } from "./boardBar.js";
import { bindKeys } from "./keys.js";
import { el, sleep } from "./dom.js";
import { showModal } from "./modal.js";

/** One battle from deployment to result. Owns the canvas events and the turn loop. */

export interface BattleScreenHandlers {
  onFinished: (state: BattleState) => void;
  onWithdraw: () => void;
}

/** How many orders can be taken back. Undo never crosses into the enemy turn. */
const UNDO_DEPTH = 40;

/** Tears down listeners so the screen can be swapped out without leaking them. */
export type Dispose = () => void;

export function mountBattle(root: HTMLElement, scenario: Scenario, h: BattleScreenHandlers): Dispose {
  let s = createBattle(scenario);
  let history: BattleState[] = [];
  let selectedId: string | null = null;
  let hoverHex: Hex | null = null;
  let mode: ActionMode = "attack";
  let busy = false;
  let finished = false;
  let animating = false;
  // On by default: reading the enemy's reach is the skill the board is here to teach.
  let showThreat = true;
  // Recomputed once per order and reused while the cursor moves, so hovering stays cheap.
  let threat: ThreatMap = new Map();
  const fx = new Effects();

  const left = el("aside", { class: "panel left" });
  const canvas = el("canvas", { class: "board" });
  const bar = el("div", { class: "board-bar" });
  const boardWrap = el("div", { class: "board-wrap" }, canvas, bar);
  const right = el("aside", { class: "panel right" });
  root.append(el("section", { class: "battle" }, left, boardWrap, right));
  sizeCanvas(canvas, scenario.width, scenario.height);

  // The rules fire these as blows land; the screen turns them into floating numbers.
  function attach(state: BattleState): BattleState {
    state.listener = {
      damage: (target, men) => {
        fx.add(target.at, `-${men}`, target.side === "player" ? "friendly" : "hit");
        startAnimation();
      },
      rout: (victim) => {
        fx.add(victim.at, victim.side === "player" ? "ROUTED" : "BROKEN", "rout");
        startAnimation();
      },
    };
    return state;
  }
  attach(s);

  function selected(): BattleUnit | null {
    return selectedId ? s.units.find((u) => u.id === selectedId) ?? null : null;
  }

  function ours(u: BattleUnit | null): boolean {
    return !!u && u.side === "player" && s.active === "player" && !busy && !s.over;
  }

  /** Remembers the current position so the next order can be taken back. */
  function push(): void {
    history.push(cloneBattle(s));
    if (history.length > UNDO_DEPTH) history.shift();
  }

  function undo(): void {
    const prev = history.pop();
    if (!prev || busy || s.over) return;
    s = attach(prev);
    fx.clear();
    if (selectedId && !s.units.some((u) => u.id === selectedId)) selectedId = null;
    mode = "attack";
    drawAll();
  }

  function hoverForecast(): Forecast | null {
    const sel = selected();
    if (!ours(sel) || !hoverHex) return null;
    const target = unitAt(s, hoverHex);
    if (!target || target.side === "player") return null;
    if (mode === "pila" && pilaTargets(s, sel!).some((t) => t.id === target.id)) return forecast(s, sel!, target, "pila");
    if (meleeTargets(s, sel!).some((t) => t.id === target.id)) return forecast(s, sel!, target, "melee");
    if (rangedTargets(s, sel!).some((t) => t.id === target.id)) return forecast(s, sel!, target, "shoot");
    return null;
  }

  function highlights(): Highlights {
    const sel = selected();
    const hl: Highlights = {
      selected: sel, reachable: new Set(), melee: new Set(), ranged: new Set(),
      pila: new Set(), hover: hoverHex, path: [], threat: showThreat ? threat : null,
    };
    if (sel && ours(sel)) {
      for (const k of reachable(s, sel).keys()) hl.reachable.add(k);
      if (mode === "pila") for (const t of pilaTargets(s, sel)) hl.pila.add(key(t.at));
      else {
        for (const t of meleeTargets(s, sel)) hl.melee.add(key(t.at));
        for (const t of rangedTargets(s, sel)) hl.ranged.add(key(t.at));
      }
      if (hoverHex && hl.reachable.has(key(hoverHex))) hl.path = pathTo(s, sel, hoverHex);
    }
    return hl;
  }

  /**
   * Who bears on the hex under the cursor. Falls back to the selected unit's own hex
   * so the panel keeps answering "am I exposed where I stand?" with nothing hovered.
   */
  function danger(): DangerView | null {
    if (!showThreat) return null;
    const sel = selected();
    const hex = hoverHex ?? sel?.at ?? null;
    if (!hex) return null;
    const cell = threatAt(threat, hex);
    if (!cell) return null;
    const here = unitAt(s, hex);
    return {
      subject: here ? here.label : "This hex",
      melee: cell.melee.map((u) => u.tmpl.name),
      missile: cell.missile.map((u) => u.tmpl.name),
    };
  }

  function view() {
    const sel = selected();
    return {
      selected: sel,
      hover: hoverHex ? unitAt(s, hoverHex) ?? null : null,
      forecast: hoverForecast(),
      danger: danger(),
      mode,
      busy,
      canUndo: history.length > 0,
    };
  }

  function drawBoard(): void {
    render(canvas, s, highlights(), fx);
  }

  /** Hover only touches the board and the inspector card, never the whole sidebar. */
  function drawHover(): void {
    drawBoard();
    updateInspector(left, s, view());
  }

  /** Every order can open or close a lane, so the enemy's reach is re-read after each one. */
  function refreshThreat(): void {
    threat = threatMap(s, "enemy");
    renderBoardBar(bar, { showThreat, threatened: threat.size }, () => toggleThreat());
  }

  function toggleThreat(): void {
    showThreat = !showThreat;
    drawAll();
  }

  function drawAll(): void {
    if (selectedId && !s.units.some((u) => u.id === selectedId)) selectedId = null;
    refreshThreat();
    drawBoard();
    renderLeftPanel(left, s, view(), {
      onFormation: (f: Formation) => applyFormation(f),
      onMode: (m) => { mode = m; drawAll(); },
      onEndTurn: () => { void runEnemyTurn(); },
      onUndo: () => undo(),
      onRestart: () => confirmRestart(),
      onRetreat: () => confirmWithdraw(),
      onLesson: () => showLesson(),
    });
    renderLog(right, s);
  }

  function startAnimation(): void {
    if (animating) return;
    animating = true;
    const step = (): void => {
      drawBoard();
      if (fx.active) requestAnimationFrame(step);
      else { animating = false; drawBoard(); }
    };
    requestAnimationFrame(step);
  }

  function applyFormation(f: Formation): void {
    const sel = selected();
    if (!ours(sel)) return;
    push();
    if (!setFormation(s, sel!, f)) history.pop();
    drawAll();
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
    drawHover();
  });
  canvas.addEventListener("mouseleave", () => { hoverHex = null; drawHover(); });

  canvas.addEventListener("click", (ev) => {
    if (busy || s.over || s.active !== "player") return;
    const hx = pointToHex(ev);
    if (!hx) return;
    const target = unitAt(s, hx);

    if (target && target.side === "player") {
      selectedId = target.id;
      mode = "attack";
      drawAll();
      return;
    }
    const sel = selected();
    if (!sel) return;

    if (target && target.side === "enemy") {
      push();
      if (mode === "pila" && pilaTargets(s, sel).some((t) => t.id === target.id)) throwPila(s, sel, target);
      else if (meleeTargets(s, sel).some((t) => t.id === target.id)) melee(s, sel, target);
      else if (rangedTargets(s, sel).some((t) => t.id === target.id)) shoot(s, sel, target);
      else { history.pop(); return; }
      mode = "attack";
      checkOver(s);
      drawAll();
      if (s.over) void finish();
      return;
    }

    push();
    if (moveUnit(s, sel, hx)) drawAll();
    else history.pop();
  });

  /** Tab through your own units that still have orders left. */
  function selectNext(): void {
    if (busy || s.over || s.active !== "player") return;
    const ready = s.units.filter((u) => u.side === "player" && !u.acted);
    if (!ready.length) return;
    const at = ready.findIndex((u) => u.id === selectedId);
    selectedId = ready[(at + 1) % ready.length]!.id;
    mode = "attack";
    drawAll();
  }

  const unbindKeys = bindKeys({
    endTurn: () => { void runEnemyTurn(); },
    undo: () => undo(),
    next: () => selectNext(),
    deselect: () => { selectedId = null; mode = "attack"; drawAll(); },
    formation: (i) => {
      const f = FORMATION_ORDER[i];
      if (f && selected()?.tmpl.canFormation) applyFormation(f);
    },
    attackMode: () => { if (ours(selected())) { mode = "attack"; drawAll(); } },
    pilaMode: () => {
      const sel = selected();
      if (ours(sel) && pilaTargets(s, sel!).length > 0) { mode = "pila"; drawAll(); }
    },
    lesson: () => showLesson(),
    threat: () => toggleThreat(),
  });

  async function runEnemyTurn(): Promise<void> {
    if (busy || s.over || s.active !== "player") return;
    busy = true;
    // The enemy turn is the commit point: what is done cannot be taken back.
    history = [];
    selectedId = null;
    endTurn(s);
    drawAll();
    if (s.over) { busy = false; await finish(); return; }
    await sleep(350);
    for (const unit of enemyTurn(s)) {
      selectedId = unit.id;
      drawAll();
      await sleep(420);
      if (s.over) break;
    }
    selectedId = null;
    checkOver(s);
    if (!s.over) endTurn(s);
    busy = false;
    drawAll();
    if (s.over) await finish();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    await sleep(700);
    h.onFinished(s);
  }

  function confirmWithdraw(): void {
    showModal("Withdraw from the field?", el("p", { text: "The battle is recorded as a defeat. Nothing else is lost; you can fight it again." }), [
      { label: "Stay and fight", onClick: () => drawAll() },
      { label: "Withdraw", onClick: () => { s.over = { won: false, reason: `${s.campaign.player.plural} withdraws in good order.` }; h.onFinished(s); }, primary: true },
    ]);
  }

  function confirmRestart(): void {
    showModal("Start the battle over?", el("p", { text: "The field is reset to the opening deployment. Nothing is recorded and no points are lost." }), [
      { label: "Keep fighting", onClick: () => drawAll() },
      {
        label: "Redeploy",
        onClick: () => {
          s = attach(createBattle(scenario));
          history = [];
          selectedId = null;
          hoverHex = null;
          mode = "attack";
          busy = false;
          finished = false;
          fx.clear();
          right.dataset.lines = "";
          drawAll();
        },
        primary: true,
      },
    ]);
  }

  function showLesson(): void {
    showModal(scenario.title, el("div", {},
      el("p", { class: "muted", text: `${scenario.year} · ${scenario.place}` }),
      el("p", { text: scenario.briefing }),
      el("div", { class: "lesson-box" }, el("h3", { text: `Lesson: ${scenario.tactic}` }), el("p", { text: scenario.lesson })),
      el("h3", { text: "Objectives" }),
      ...scenario.objectives.map((o) => el("div", { class: "objective" }, el("span", { class: "pts", text: `+${o.points}` }), o.text)),
      el("h3", { text: "Reading the board" }),
      el("p", { class: "muted small", text: `Red hatching marks every hex ${s.campaign.enemy.plural.toLowerCase()} could charge next turn; purple dots mark what their archers can reach. Press T to hide or show it.` }),
      el("h3", { text: "Keys" }),
      el("p", { class: "muted small", text: "Enter end turn · Tab next unit · 1-4 formation · A gladius · P pila · T enemy reach · U undo · Esc deselect · L this briefing" }),
    ), [{ label: "To the field", onClick: () => drawAll(), primary: true }]);
  }

  drawAll();
  showLesson();

  return () => unbindKeys();
}

export { toStats };
