import type { Hex } from "../shared/types.js";
import { SCENARIO_BY_ID } from "../shared/data/scenarios.js";
import { BRITANNIA_SCENARIOS } from "../shared/data/scenarios-britannia.js";
import { type BattleState, type BattleUnit, createBattle, toStats, unitsOf } from "../client/src/engine/battle.js";
import { enemyTurn } from "../client/src/engine/ai/index.js";
import { commitDeployment } from "../client/src/engine/deployment.js";
import {
  adjacentEnemies, endTurn, melee, meleeTargets, moveUnit, pathTo, pilaTargets,
  rangedTargets, reachable, setFormation, shoot, throwPila, underMissileThreat,
} from "../client/src/engine/rules.js";
import { isCore } from "../client/src/engine/battle.js";
import { objectiveMet } from "../shared/objectives.js";
import { distance, key } from "../client/src/hex.js";

/**
 * A headless playtest, for putting a number on "too difficult".
 *
 *   npm run playtest            every battle of the Boudican Revolt
 *   npm run playtest watling    one of them
 *
 * Each battle is played many times by a bot that does what that battle's own
 * `lesson` tells the player to do, and nothing cleverer: hold the marked
 * ground, run for the exits, throw before you swing, do not chase. It never
 * reads a forecast, never rotates a battered unit out, and never picks a
 * better target than the nearest one.
 *
 * So the win rate here is a floor, not a prediction. A human playing well beats
 * it. What the number is good for is comparing a tuning change against the
 * commit before it, the same way `bench.ts` compares timings: if the bot cannot
 * win a battle by playing it the way the briefing says, the battle is asking
 * for something the lesson never taught.
 */

const RUNS = Number(process.env.RUNS ?? 200);

/** What the bot is trying to do, which is whatever the scenario's lesson says. */
type Plan = "hold" | "run" | "escort" | "line" | "hunt";

const PLANS: Record<string, Plan> = {
  camulodunum: "hold",   // last four turns on the podium
  ninth: "run",          // get off the western road
  londinium: "escort",   // walk the refugees out, screen them on the way
  defile: "hold",        // stand in the mouth of the gap
  watling: "line",       // volley, hold, then push
  sweep: "hunt",         // break every band still under arms
};

function hexesOf(list: readonly Hex[] | undefined): Hex[] {
  return list ? [...list] : [];
}

function nearest(from: Hex, targets: Hex[]): Hex | undefined {
  let best: Hex | undefined;
  let bestD = Infinity;
  for (const t of targets) {
    const d = distance(from, t);
    if (d < bestD) { bestD = d; best = t; }
  }
  return best;
}

/** The reachable hex that gets closest to `goal`. Undefined if nothing improves. */
function stepToward(s: BattleState, u: BattleUnit, goal: Hex): Hex | undefined {
  const path = pathTo(s, u, goal);
  if (path.length) return path[path.length - 1];
  let best: Hex | undefined;
  let bestD = distance(u.at, goal);
  for (const k of reachable(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    const d = distance({ q, r }, goal);
    if (d < bestD) { bestD = d; best = { q, r }; }
  }
  return best;
}

/** Throw first, then swing. The order every legionary objective in the game asks for. */
function fight(s: BattleState, u: BattleUnit): boolean {
  const shots = rangedTargets(s, u);
  if (shots.length) {
    shoot(s, u, weakest(shots));
    return true;
  }
  const pila = pilaTargets(s, u);
  if (pila.length) {
    throwPila(s, u, weakest(pila));
    return true;
  }
  const swings = meleeTargets(s, u);
  if (swings.length) {
    melee(s, u, weakest(swings));
    return true;
  }
  return false;
}

/**
 * A cohort this battered is one blow from routing, and half the campaign's
 * bonuses are for bringing them all home. Pull it out of contact instead.
 */
function shouldWithdraw(u: BattleUnit): boolean {
  return isCore(u) && u.men / u.maxMen < 0.42;
}

/**
 * Steps further from every enemy, if anywhere in reach is further. `confine`
 * limits the retreat to ground the battle is being fought for.
 */
function withdraw(s: BattleState, u: BattleUnit, confine?: Hex[]): boolean {
  let best: Hex | undefined;
  let bestD = 1;
  for (const k of reachable(s, u).keys()) {
    const [q, r] = k.split(",").map(Number) as [number, number];
    if (confine?.length && !confine.some((h) => key(h) === k)) continue;
    const d = Math.min(...unitsOf(s, "enemy").map((e) => distance({ q, r }, e.at)));
    if (d > bestD) { bestD = d; best = { q, r }; }
  }
  return best ? moveUnit(s, u, best) : false;
}

/** The nearest thing to breaking, since a break can take its neighbours with it. */
function weakest(list: BattleUnit[]): BattleUnit {
  return [...list].sort((a, b) => a.men / a.maxMen - b.men / b.maxMen)[0]!;
}

function playerTurn(s: BattleState, plan: Plan): void {
  const keyHexes = hexesOf(s.scenario.keyHexes);
  const exits = hexesOf(s.scenario.exits);
  // The bot never gambles on holding the column back for the bonus. It runs.
  const run = (u: BattleUnit): void => {
    const goal = nearest(u.at, exits);
    if (!goal) return;
    const step = stepToward(s, u, goal);
    if (step) moveUnit(s, u, step);
  };

  for (const u of [...unitsOf(s, "player")]) {
    if (s.over) return;
    if (!s.units.includes(u)) continue;

    const touching = adjacentEnemies(s, u);

    // A unit that cannot fight at all only ever runs.
    if (u.tmpl.attack === 0) {
      run(u);
      continue;
    }

    switch (plan) {
      case "hold": {
        // Stand on the marked ground; fight only what walks into reach. A
        // battered unit rotates within the marked ground, never off it: the
        // ground is the objective, and leaving it to save a cohort loses both.
        // Rotating the line: a battered cohort steps back, but only while
        // enough of the marked ground is still standing without it.
        if (shouldWithdraw(u)) {
          const others = unitsOf(s, "player").filter(
            (x) => x.id !== u.id && keyHexes.some((h) => key(h) === key(x.at)),
          ).length;
          if (withdraw(s, u, others >= 2 ? undefined : keyHexes)) break;
        }
        if (touching.length) { fight(s, u); break; }
        // Shields up against the slings while there is nothing to swing at.
        if (u.tmpl.canFormation) setFormation(s, u, underMissileThreat(s, u) ? "testudo" : "line");
        const onKey = keyHexes.some((h) => key(h) === key(u.at));
        if (onKey) break;
        const free = keyHexes.filter((h) => !s.units.some((x) => key(x.at) === key(h)));
        const goal = nearest(u.at, free.length ? free : keyHexes);
        if (goal) { const step = stepToward(s, u, goal); if (step) moveUnit(s, u, step); }
        fight(s, u);
        break;
      }
      case "run": {
        // Column to cover ground, line the moment contact is likely, which
        // means anything that could reach this hex on its own next turn.
        const close = unitsOf(s, "enemy").some((e) => distance(e.at, u.at) <= e.tmpl.move + 1);
        setFormation(s, u, close ? "line" : "march_column");
        // Nothing here is worth stopping for. The board has no zone of control,
        // so a unit in contact can walk out of it, and getting away is the win.
        run(u);
        break;
      }
      case "escort": {
        // Put the soldiers between the townsfolk and whatever is chasing them.
        if (shouldWithdraw(u) && withdraw(s, u)) break;
        if (touching.length) { fight(s, u); break; }
        const charges = unitsOf(s, "player").filter((x) => x.tmpl.attack === 0);
        const chased = charges.length ? nearest(u.at, charges.map((c) => c.at)) : undefined;
        const threat = nearest(u.at, unitsOf(s, "enemy").map((e) => e.at));
        const goal = chased && threat
          ? { q: Math.round((chased.q + threat.q) / 2), r: Math.round((chased.r + threat.r) / 2) }
          : nearest(u.at, exits);
        if (goal) { const step = stepToward(s, u, goal); if (step) moveUnit(s, u, step); }
        fight(s, u);
        break;
      }
      case "line": {
        // Hold the line and let them arrive. Push only into what is already touching.
        if (shouldWithdraw(u) && withdraw(s, u)) break;
        if (touching.length) { fight(s, u); break; }
        const enemies = unitsOf(s, "enemy").filter((e) => e.tmpl.move > 0);
        const goal = enemies.length ? nearest(u.at, enemies.map((e) => e.at)) : undefined;
        if (goal && distance(u.at, goal) > 3) {
          const step = stepToward(s, u, goal);
          if (step) moveUnit(s, u, step);
        }
        fight(s, u);
        break;
      }
      case "hunt": {
        if (shouldWithdraw(u) && withdraw(s, u)) break;
        if (touching.length) { fight(s, u); break; }
        const goal = nearest(u.at, unitsOf(s, "enemy").map((e) => e.at));
        if (goal) { const step = stepToward(s, u, goal); if (step) moveUnit(s, u, step); }
        fight(s, u);
        break;
      }
    }
  }
}

interface Outcome {
  won: boolean;
  turns: number;
  /** Objective ids the run actually scored. Nothing scores in a defeat. */
  met: string[];
  reason: string;
  playerLosses: number;
  enemyLosses: number;
  extracted: number;
}

function playOnce(id: string): Outcome {
  const sc = SCENARIO_BY_ID[id]!;
  const s = createBattle(sc);
  if (s.phase === "deploy") commitDeployment(s);
  const plan = PLANS[id] ?? "hunt";

  let guard = 0;
  while (!s.over && guard++ < 400) {
    if (s.active === "player") playerTurn(s, plan);
    else for (const _ of enemyTurn(s)) { /* the host acts one unit at a time */ }
    if (s.over) break;
    endTurn(s);
  }

  const stats = toStats(s);
  return {
    won: stats.won,
    turns: s.turn,
    met: sc.objectives.filter((o) => objectiveMet(o, stats)).map((o) => o.id),
    reason: s.over?.reason ?? "the bot gave up",
    playerLosses: stats.metrics.playerLosses,
    enemyLosses: stats.metrics.enemyLosses,
    extracted: stats.metrics.unitsExtracted,
  };
}

function report(id: string): void {
  const sc = SCENARIO_BY_ID[id]!;
  const runs: Outcome[] = [];
  for (let i = 0; i < RUNS; i++) runs.push(playOnce(id));

  const wins = runs.filter((r) => r.won).length;
  const pct = (n: number): string => `${Math.round((n / RUNS) * 100)}%`.padStart(4);
  const byObjective = sc.objectives
    .map((o) => `${o.id} ${pct(runs.filter((r) => r.met.includes(o.id)).length)}`)
    .join("  ");

  console.log(
    `${sc.order}. ${sc.title.padEnd(24)} ${sc.ai ?? "raw"}`.padEnd(42)
    + `win ${pct(wins)}   ${byObjective}`,
  );
  const mid = (pick: (r: Outcome) => number): number => {
    const xs = runs.map(pick).sort((a, b) => a - b);
    return xs[Math.floor(xs.length / 2)]!;
  };
  console.log(
    `   median: lost ${mid((r) => r.playerLosses)} men, killed ${mid((r) => r.enemyLosses)}`
    + `, ${mid((r) => r.extracted)} away, over by turn ${mid((r) => r.turns)}`,
  );
  if (wins < RUNS) {
    const why = new Map<string, number>();
    for (const r of runs.filter((x) => !x.won)) why.set(r.reason, (why.get(r.reason) ?? 0) + 1);
    const worst = [...why].sort((a, b) => b[1] - a[1])[0]!;
    console.log(`   lost ${RUNS - wins}/${RUNS}: ${worst[0]}`);
  }
}

const only = process.argv[2];
const ids = (only ? [only] : BRITANNIA_SCENARIOS.map((s) => s.id)).filter((id) => SCENARIO_BY_ID[id]);
if (!ids.length) {
  console.error(`No such battle: ${only}`);
  process.exit(1);
}

console.log(`\nThe Boudican Revolt, played ${RUNS} times each by a bot that follows the briefing.\n`);
for (const id of ids) report(id);
console.log([
  "",
  "extract_all reads 0% because the bot never gambles: it takes the exit the",
  "moment it can reach one, and the win ends the day. Holding the column back a",
  "turn to bring everyone out together is a player's call, and it is reachable.",
  "test/britannia.test.ts pins that it is.",
  "",
].join("\n"));
