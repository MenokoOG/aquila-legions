import { api } from "./api.js";
import type { BattleState } from "./engine/battle.js";
import { toStats } from "./engine/battle.js";
import { SCENARIO_BY_ID } from "../../shared/data/scenarios.js";
import { button, clear, el } from "./ui/dom.js";
import { showModal } from "./ui/modal.js";
import { renderMenu } from "./ui/menu.js";
import { renderCodex } from "./ui/codex.js";
import { mountBattle } from "./ui/battleScreen.js";

/** Screen router. Menu, battle, codex. Nothing else lives here. */

const screen = document.getElementById("screen")!;
const nav = document.getElementById("nav")!;

function setNav(...nodes: HTMLElement[]): void {
  clear(nav);
  nav.append(...nodes);
}

function fail(err: unknown): void {
  clear(screen);
  screen.append(el("section", { class: "panel" },
    el("h2", { text: "The courier did not arrive" }),
    el("p", { text: `Could not reach the local server: ${(err as Error).message}` }),
    el("p", { class: "muted", text: "Run `npm run dev` in the aquila-legions folder, then reload." }),
    button("Retry", () => void showMenu()),
  ));
}

async function showMenu(): Promise<void> {
  try {
    const data = await api.state();
    clear(screen);
    setNav(
      el("span", { class: "pill", text: `${data.save.rank}` }),
      el("span", { class: "pill", text: `${data.save.historyPoints} pts` }),
    );
    screen.append(renderMenu(data, {
      onStart: (id) => void startBattle(id),
      onCodex: () => void showCodex(),
      onRename: () => rename(data.save.commander),
      onReset: () => confirmReset(),
    }));
  } catch (err) {
    fail(err);
  }
}

async function showCodex(): Promise<void> {
  try {
    const entries = await api.codex();
    clear(screen);
    setNav(button("Campaign", () => void showMenu(), "btn quiet"));
    screen.append(renderCodex(entries, () => void showMenu()));
    window.scrollTo(0, 0);
  } catch (err) {
    fail(err);
  }
}

async function startBattle(id: string): Promise<void> {
  try {
    const scenario = (await api.scenario(id).catch(() => SCENARIO_BY_ID[id])) ?? SCENARIO_BY_ID[id];
    if (!scenario) throw new Error("scenario not found");
    clear(screen);
    setNav(el("span", { class: "pill", text: scenario.title }));
    mountBattle(screen, scenario, {
      onFinished: (state) => void submit(state),
      onWithdraw: () => void showMenu(),
    });
    window.scrollTo(0, 0);
  } catch (err) {
    fail(err);
  }
}

async function submit(state: BattleState): Promise<void> {
  const stats = toStats(state);
  const sc = state.scenario;
  try {
    const out = await api.result(sc.id, stats);
    const rows = sc.objectives.map((o) => {
      const met = out.objectivesMet.includes(o.kind);
      return el("div", { class: `result-row ${met ? "met" : "missed"}` },
        el("span", { class: "mark-x", text: met ? "✓" : "·" }),
        el("span", { text: o.text }),
        el("span", { class: "muted", text: ` +${o.points}` }),
      );
    });
    const body = el("div", {},
      el("p", { class: "muted", text: state.over?.reason ?? "" }),
      el("p", { text: `${stats.turns} turns · Roman losses ${stats.romanLosses} · Dacian losses ${stats.dacianLosses}` }),
      el("div", { class: "points-big", text: out.pointsEarned > 0 ? `+${out.pointsEarned} history points` : stats.won ? "Already earned" : "No points" }),
      ...rows,
      out.rankUp ? el("p", { class: "lesson-box", text: `Promoted: ${out.rankUp}` }) : null,
      ...out.newCodex.map((c) => el("div", { class: "new-codex" },
        el("h3", { text: `Codex unlocked: ${c.title}` }),
        el("p", { text: c.body[0] ?? "" }),
      )),
      !stats.won ? el("div", { class: "lesson-box" }, el("h3", { text: `Try: ${sc.tactic}` }), el("p", { text: sc.lesson })) : null,
    );
    showModal(stats.won ? "Victory" : "Defeat", body, [
      { label: "Campaign", onClick: () => void showMenu() },
      ...(out.newCodex.length ? [{ label: "Read the Codex", onClick: () => void showCodex() }] : []),
      { label: stats.won ? "Next" : "Fight again", onClick: () => void (stats.won ? showMenu() : startBattle(sc.id)), primary: true },
    ]);
  } catch (err) {
    showModal("Result not saved", el("p", { text: (err as Error).message }), [
      { label: "Campaign", onClick: () => void showMenu(), primary: true },
    ]);
  }
}

function rename(current: string): void {
  const input = el("input", { class: "name", value: current, maxlength: "32" });
  showModal("Name the commander", el("div", {}, el("p", { text: "Receipts of victory are written in this name." }), input), [
    { label: "Cancel", onClick: () => void showMenu() },
    { label: "Save", onClick: () => void api.commander(input.value).then(() => showMenu()).catch(fail), primary: true },
  ]);
  setTimeout(() => input.focus(), 0);
}

function confirmReset(): void {
  showModal("Reset the campaign?", el("p", { text: "All history points, victories, and Codex unlocks are erased. This cannot be undone." }), [
    { label: "Keep everything", onClick: () => void showMenu() },
    { label: "Erase and start over", onClick: () => void api.reset().then(() => showMenu()).catch(fail), primary: true },
  ]);
}

void showMenu();
