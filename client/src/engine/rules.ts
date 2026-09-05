import type { Formation, Hex, Side, Terrain } from "../../../shared/types.js";
import { FORMATIONS } from "../../../shared/data/formations.js";
import { distance, key, neighbors, same } from "../hex.js";
import {
  type BattleState, type BattleUnit, faction, isCore, log, opposing, terrainAt, unitAt, unitsOf,
} from "./battle.js";

/** Movement, combat, and turn rules. Every number that shapes play lives here or in the formation table. */

const ROUT_FRACTION = 0.25;
const MELEE_SCALE = 3.0;
const RETALIATION = 0.55;

/** The luck band on every attack. Forecasts read these so the range they show is the real one. */
export const ROLL_MIN = 0.85;
export const ROLL_MAX = 1.15;

let roll: () => number = () => ROLL_MIN + Math.random() * (ROLL_MAX - ROLL_MIN);

/** Tests swap in a deterministic roll. The game never calls this. */
export function setRoll(fn: () => number): void {
  roll = fn;
}

export function moveCost(t: Terrain): number {
  return t === "plain" ? 1 : 2;
}

function terrainDefense(t: Terrain): number {
  if (t === "hill") return 1.2;
  if (t === "forest") return 1.15;
  return 1.0;
}

export function effectiveMove(u: BattleUnit): number {
  return FORMATIONS[u.formation].moveOverride ?? u.tmpl.move;
}

interface Search {
  cost: Map<string, number>;
  from: Map<string, Hex>;
}

/**
 * Dijkstra over move points. Enemies block; friends can be crossed but not stopped on.
 * `fresh` ignores orders already spent this turn, which is how the threat overlay asks
 * where a unit could go once its turn comes round again.
 */
function search(s: BattleState, u: BattleUnit, fresh = false): Search {
  const budget = effectiveMove(u);
  const cost = new Map<string, number>();
  const from = new Map<string, Hex>();
  if ((!fresh && (u.moved || u.acted)) || budget === 0) return { cost, from };
  const best = new Map<string, number>([[key(u.at), 0]]);
  const frontier: { h: Hex; cost: number }[] = [{ h: u.at, cost: 0 }];
  const { width, height } = s.scenario;
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    for (const n of neighbors(cur.h, width, height)) {
      const occupant = unitAt(s, n);
      if (occupant && occupant.side !== u.side) continue;
      const c = cur.cost + moveCost(terrainAt(s, n));
      if (c > budget) continue;
      const k = key(n);
      if ((best.get(k) ?? Infinity) <= c) continue;
      best.set(k, c);
      from.set(k, cur.h);
      frontier.push({ h: n, cost: c });
      if (!occupant) cost.set(k, c);
    }
  }
  return { cost, from };
}

/** Hexes this unit can end its move on, mapped to what the trip costs. */
export function reachable(s: BattleState, u: BattleUnit): Map<string, number> {
  return search(s, u).cost;
}

/**
 * Where the unit could stand on a fresh turn, whatever it has already done this one.
 * The board it walks is the board as it stands now, so a cohort stepping into a
 * gap narrows the enemy's reach the moment it moves.
 */
export function projectedReach(s: BattleState, u: BattleUnit): Map<string, number> {
  return search(s, u, true).cost;
}

/** The route the unit would walk to `to`, first step first. Empty if it cannot get there. */
export function pathTo(s: BattleState, u: BattleUnit, to: Hex): Hex[] {
  const { cost, from } = search(s, u);
  if (!cost.has(key(to))) return [];
  const out: Hex[] = [];
  let cur: Hex | undefined = to;
  while (cur && !same(cur, u.at)) {
    out.unshift(cur);
    cur = from.get(key(cur));
  }
  return out;
}

export function moveUnit(s: BattleState, u: BattleUnit, to: Hex): boolean {
  const r = reachable(s, u);
  if (!r.has(key(to))) return false;
  u.movedDist = distance(u.at, to);
  u.at = { ...to };
  u.moved = true;
  return true;
}

export function adjacentEnemies(s: BattleState, u: BattleUnit): BattleUnit[] {
  const { width, height } = s.scenario;
  return neighbors(u.at, width, height)
    .map((h) => unitAt(s, h))
    .filter((x): x is BattleUnit => !!x && x.side !== u.side);
}

export function isFlanked(s: BattleState, target: BattleUnit): boolean {
  if (FORMATIONS[target.formation].ignoresFlanking) return false;
  return adjacentEnemies(s, target).length >= 2;
}

export function canMelee(u: BattleUnit): boolean {
  return !u.acted && u.tmpl.range === 0;
}

export function meleeTargets(s: BattleState, u: BattleUnit): BattleUnit[] {
  return canMelee(u) ? adjacentEnemies(s, u) : [];
}

export function rangedTargets(s: BattleState, u: BattleUnit): BattleUnit[] {
  if (u.acted || u.tmpl.range === 0) return [];
  return unitsOf(s, opposing(u.side)).filter((e) => distance(u.at, e.at) <= u.tmpl.range);
}

export function pilaTargets(s: BattleState, u: BattleUnit): BattleUnit[] {
  if (u.acted || u.pila <= 0 || !isCore(u) || FORMATIONS[u.formation].blocksPila) return [];
  return adjacentEnemies(s, u);
}

export function canChangeFormation(u: BattleUnit): boolean {
  return u.tmpl.canFormation && !u.moved && !u.acted;
}

export function setFormation(s: BattleState, u: BattleUnit, f: Formation): boolean {
  if (!canChangeFormation(u) || u.formation === f) return false;
  u.formation = f;
  log(s, `${u.label} forms ${f === "line" ? "line" : f}.`);
  return true;
}

function strength(u: BattleUnit): number {
  return 0.5 + 0.5 * (u.men / u.maxMen);
}

function attackMultiplier(s: BattleState, a: BattleUnit, t: BattleUnit, charge: boolean): number {
  let m = FORMATIONS[a.formation].attackMul;
  if (charge && a.movedDist >= 2) m *= a.tmpl.chargeBonus;
  if (isFlanked(s, t)) m *= 1.3;
  return m;
}

function defenseValue(s: BattleState, a: BattleUnit, t: BattleUnit, missile: boolean): number {
  let d = t.tmpl.defense * terrainDefense(terrainAt(s, t.at));
  d *= FORMATIONS[t.formation].defenseMul;
  if (!missile) d *= a.tmpl.armourPiercing;
  return d;
}

export type AttackKind = "melee" | "pila" | "shoot" | "retaliation";

/** Attack power before the luck roll. Pure, so the forecast and the real blow share one formula. */
export function attackPower(s: BattleState, a: BattleUnit, t: BattleUnit, kind: AttackKind): number {
  const base = a.tmpl.attack * strength(a);
  switch (kind) {
    case "melee": return base * attackMultiplier(s, a, t, true) * MELEE_SCALE;
    case "pila": return base * 1.6 * MELEE_SCALE;
    case "shoot": return base * 2.4;
    case "retaliation": return base * RETALIATION * MELEE_SCALE;
  }
}

/** How many men a blow of `raw` power takes off `t`. Pure: nothing is changed. */
export function damageToMen(
  s: BattleState, a: BattleUnit, t: BattleUnit, raw: number, missile: boolean,
): number {
  let dmg = raw;
  if (missile) dmg *= FORMATIONS[t.formation].missileMul;
  const d = defenseValue(s, a, t, missile);
  return Math.min(t.men, Math.max(1, Math.round(dmg * (100 / (100 + d)))));
}

/** Whether losing `menLost` puts a unit at or under the rout threshold. */
export function wouldRout(t: BattleUnit, menLost: number): boolean {
  return t.men - menLost <= t.maxMen * ROUT_FRACTION;
}

function applyDamage(s: BattleState, a: BattleUnit, t: BattleUnit, raw: number, missile: boolean): number {
  const men = damageToMen(s, a, t, raw, missile);
  t.men = Math.max(0, t.men - men);
  if (t.side === "player") s.track.playerLosses += men; else s.track.enemyLosses += men;
  if (missile && t.side === "player") s.track.missileLosses += men;
  s.listener?.damage?.(t, men, missile);
  return men;
}

function checkRout(s: BattleState, victim: BattleUnit, killer: BattleUnit, flanked: boolean): void {
  if (victim.men > victim.maxMen * ROUT_FRACTION) return;
  s.units = s.units.filter((u) => u.id !== victim.id);
  log(s, `${victim.label} breaks and routs.`, "system");
  s.listener?.rout?.(victim);
  if (victim.side === "player" && isCore(victim)) s.track.cohortsRouted += 1;
  if (victim.side === "enemy") {
    if (killer.formation === "cuneus") s.track.cuneusKills += 1;
    if (flanked) s.track.flankKills += 1;
    if (killer.tmpl.mounted) s.track.cavalryKills += 1;
  }
}

export function melee(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!meleeTargets(s, a).some((x) => x.id === t.id)) return;
  const flanked = isFlanked(s, t);
  const dealt = applyDamage(s, a, t, attackPower(s, a, t, "melee") * roll(), false);
  a.acted = true;
  a.moved = true;
  if (a.side === "player" && isCore(a)) {
    s.track.cohortsInMelee.add(a.id);
    if (!s.track.cohortsThrown.has(a.id)) s.track.pilaViolated = true;
  }
  const note = flanked ? " (flanked)" : a.formation === "cuneus" ? " (wedge)" : "";
  log(s, `${a.label} charges ${t.label}${note}: ${dealt} fall.`);
  checkRout(s, t, a, flanked);
  if (t.men > 0 && s.units.includes(t)) {
    const taken = applyDamage(s, t, a, attackPower(s, t, a, "retaliation") * roll(), false);
    log(s, `${t.label} fights back: ${taken} fall.`);
    checkRout(s, a, t, false);
  }
}

export function throwPila(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!pilaTargets(s, a).some((x) => x.id === t.id)) return;
  const dealt = applyDamage(s, a, t, attackPower(s, a, t, "pila") * roll(), true);
  a.pila -= 1;
  a.acted = true;
  s.track.cohortsThrown.add(a.id);
  log(s, `${a.label} hurls pila into ${t.label}: ${dealt} fall.`);
  checkRout(s, t, a, isFlanked(s, t));
}

export function shoot(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!rangedTargets(s, a).some((x) => x.id === t.id)) return;
  const dealt = applyDamage(s, a, t, attackPower(s, a, t, "shoot") * roll(), true);
  a.acted = true;
  const verb = a.tmpl.missileVerb ?? "shoots";
  log(s, `${a.label} ${verb} ${t.label}: ${dealt} fall${t.formation === "testudo" ? " (testudo holds)" : ""}.`);
  checkRout(s, t, a, isFlanked(s, t));
}

/** True when an enemy missile unit can reach this hex right now. */
export function underMissileThreat(s: BattleState, u: BattleUnit): boolean {
  return unitsOf(s, opposing(u.side)).some(
    (e) => e.tmpl.range > 0 && distance(e.at, u.at) <= e.tmpl.range,
  );
}

/** Tally the formation-discipline objectives at the end of each player turn. */
function tallyPlayerTurn(s: BattleState): void {
  for (const u of unitsOf(s, "player")) {
    if (!isCore(u)) continue;
    if (u.formation === "testudo" && underMissileThreat(s, u)) s.track.testudoTurnsUnderFire += 1;
    if (u.formation === "orbis" && adjacentEnemies(s, u).some((e) => e.tmpl.mounted)) {
      s.track.orbisHeldTurns += 1;
    }
  }
}

export function checkOver(s: BattleState): void {
  if (s.over) return;
  if (unitsOf(s, "enemy").length === 0) {
    s.over = { won: true, reason: `The field is yours. ${faction(s, "enemy").plural} are broken.` };
  } else if (unitsOf(s, "player").length === 0) {
    s.over = { won: false, reason: `${faction(s, "player").plural} is destroyed.` };
  } else if (s.turn > s.scenario.maxTurns) {
    s.over = { won: false, reason: "Night falls with the enemy still in the field." };
  }
  if (s.over) log(s, s.over.reason, "system");
}

export function endTurn(s: BattleState): Side {
  if (s.active === "player") tallyPlayerTurn(s);
  for (const u of s.units) { u.moved = false; u.acted = false; u.movedDist = 0; }
  s.active = opposing(s.active);
  if (s.active === "player") s.turn += 1;
  checkOver(s);
  if (!s.over) {
    log(s, s.active === "player"
      ? `Turn ${s.turn}. Your orders, Legatus.`
      : `${faction(s, "enemy").plural} move.`, "system");
  }
  return s.active;
}

export function sameHex(a: Hex, b: Hex): boolean {
  return same(a, b);
}
