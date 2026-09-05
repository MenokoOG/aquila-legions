import type { Formation, Hex, Side, Terrain } from "../../../shared/types.js";
import { distance, key, neighbors, same } from "../hex.js";
import {
  type BattleState, type BattleUnit, isLegionary, log, terrainAt, unitAt, unitsOf,
} from "./battle.js";

/** Movement, combat, and turn rules. Every number that shapes play lives here. */

const ROUT_FRACTION = 0.25;
const MELEE_SCALE = 3.0;
const RETALIATION = 0.55;

export function moveCost(t: Terrain): number {
  return t === "plain" ? 1 : 2;
}

function terrainDefense(t: Terrain): number {
  if (t === "hill") return 1.2;
  if (t === "forest") return 1.15;
  return 1.0;
}

export function effectiveMove(u: BattleUnit): number {
  if (u.formation === "orbis") return 0;
  if (u.formation === "testudo") return 1;
  return u.tmpl.move;
}

/** Dijkstra over move points. Enemies block; friends can be crossed but not stopped on. */
export function reachable(s: BattleState, u: BattleUnit): Map<string, number> {
  const budget = effectiveMove(u);
  const out = new Map<string, number>();
  if (u.moved || u.acted || budget === 0) return out;
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
      frontier.push({ h: n, cost: c });
      if (!occupant) out.set(k, c);
    }
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
  if (target.formation === "orbis") return false;
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
  return unitsOf(s, u.side === "rome" ? "dacia" : "rome").filter(
    (e) => distance(u.at, e.at) <= u.tmpl.range,
  );
}

export function pilaTargets(s: BattleState, u: BattleUnit): BattleUnit[] {
  if (u.acted || u.pila <= 0 || !isLegionary(u) || u.formation === "testudo") return [];
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

function rand(): number {
  return 0.85 + Math.random() * 0.3;
}

function strength(u: BattleUnit): number {
  return 0.5 + 0.5 * (u.men / u.maxMen);
}

function attackMultiplier(s: BattleState, a: BattleUnit, t: BattleUnit, charge: boolean): number {
  let m = 1;
  if (a.formation === "cuneus") m *= 1.4;
  if (a.formation === "testudo") m *= 0.7;
  if (a.formation === "orbis") m *= 0.8;
  if (charge && a.kind === "cataphracts" && a.movedDist >= 2) m *= 1.5;
  if (charge && a.kind === "ala_cavalry" && a.movedDist >= 2) m *= 1.25;
  if (isFlanked(s, t)) m *= 1.3;
  return m;
}

function defenseValue(s: BattleState, a: BattleUnit, t: BattleUnit, missile: boolean): number {
  let d = t.tmpl.defense * terrainDefense(terrainAt(s, t.at));
  if (t.formation === "orbis") d *= 1.35;
  if (t.formation === "cuneus") d *= 0.75;
  if (a.kind === "falxmen" && !missile) d *= 0.7;
  return d;
}

function applyDamage(s: BattleState, a: BattleUnit, t: BattleUnit, raw: number, missile: boolean): number {
  let dmg = raw;
  if (missile && t.formation === "testudo") dmg *= 0.25;
  const d = defenseValue(s, a, t, missile);
  const men = Math.max(1, Math.round(dmg * (100 / (100 + d))));
  t.men = Math.max(0, t.men - men);
  if (t.side === "rome") s.track.romanLosses += men; else s.track.dacianLosses += men;
  if (missile && t.side === "rome") s.track.missileLosses += men;
  return men;
}

function checkRout(s: BattleState, victim: BattleUnit, killer: BattleUnit, flanked: boolean): void {
  if (victim.men > victim.maxMen * ROUT_FRACTION) return;
  s.units = s.units.filter((u) => u.id !== victim.id);
  log(s, `${victim.label} breaks and routs.`, "system");
  if (victim.side === "rome" && isLegionary(victim)) s.track.cohortsRouted += 1;
  if (victim.side === "dacia") {
    if (killer.formation === "cuneus") s.track.cuneusKills += 1;
    if (flanked) s.track.flankKills += 1;
    if (killer.kind === "ala_cavalry") s.track.cavalryKills += 1;
  }
}

export function melee(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!meleeTargets(s, a).some((x) => x.id === t.id)) return;
  const flanked = isFlanked(s, t);
  const raw = a.tmpl.attack * strength(a) * attackMultiplier(s, a, t, true) * MELEE_SCALE * rand();
  const dealt = applyDamage(s, a, t, raw, false);
  a.acted = true;
  a.moved = true;
  if (a.side === "rome" && isLegionary(a)) {
    s.track.cohortsInMelee.add(a.id);
    if (!s.track.cohortsThrown.has(a.id)) s.track.pilaViolated = true;
  }
  const note = flanked ? " (flanked)" : a.formation === "cuneus" ? " (wedge)" : "";
  log(s, `${a.label} charges ${t.label}${note}: ${dealt} fall.`);
  checkRout(s, t, a, flanked);
  if (t.men > 0 && s.units.includes(t)) {
    const back = t.tmpl.attack * strength(t) * RETALIATION * MELEE_SCALE * rand();
    const taken = applyDamage(s, t, a, back, false);
    log(s, `${t.label} fights back: ${dealt > 0 ? taken : 0} fall.`);
    checkRout(s, a, t, false);
  }
}

export function throwPila(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!pilaTargets(s, a).some((x) => x.id === t.id)) return;
  const raw = a.tmpl.attack * strength(a) * 1.6 * MELEE_SCALE * rand();
  const dealt = applyDamage(s, a, t, raw, true);
  a.pila -= 1;
  a.acted = true;
  s.track.cohortsThrown.add(a.id);
  log(s, `${a.label} hurls pila into ${t.label}: ${dealt} fall.`);
  checkRout(s, t, a, isFlanked(s, t));
}

export function shoot(s: BattleState, a: BattleUnit, t: BattleUnit): void {
  if (!rangedTargets(s, a).some((x) => x.id === t.id)) return;
  const raw = a.tmpl.attack * strength(a) * 2.4 * rand();
  const dealt = applyDamage(s, a, t, raw, true);
  a.acted = true;
  const verb = a.kind === "scorpio" ? "looses bolts at" : "shoots";
  log(s, `${a.label} ${verb} ${t.label}: ${dealt} fall${t.formation === "testudo" ? " (testudo holds)" : ""}.`);
  checkRout(s, t, a, isFlanked(s, t));
}

function underMissileThreat(s: BattleState, u: BattleUnit): boolean {
  return unitsOf(s, "dacia").some((e) => e.tmpl.range > 0 && distance(e.at, u.at) <= e.tmpl.range);
}

/** Tally the formation-discipline objectives at the end of each Roman turn. */
function tallyRomanTurn(s: BattleState): void {
  for (const u of unitsOf(s, "rome")) {
    if (!isLegionary(u)) continue;
    if (u.formation === "testudo" && underMissileThreat(s, u)) s.track.testudoTurnsUnderFire += 1;
    if (u.formation === "orbis" && adjacentEnemies(s, u).some((e) => e.kind === "cataphracts")) {
      s.track.orbisHeldTurns += 1;
    }
  }
}

export function checkOver(s: BattleState): void {
  if (s.over) return;
  if (unitsOf(s, "dacia").length === 0) {
    s.over = { won: true, reason: "The field is yours. The Dacians are broken." };
  } else if (unitsOf(s, "rome").length === 0) {
    s.over = { won: false, reason: "The legion is destroyed." };
  } else if (s.turn > s.scenario.maxTurns) {
    s.over = { won: false, reason: "Night falls with the enemy still in the field." };
  }
  if (s.over) log(s, s.over.reason, "system");
}

export function endTurn(s: BattleState): Side {
  if (s.active === "rome") tallyRomanTurn(s);
  for (const u of s.units) { u.moved = false; u.acted = false; u.movedDist = 0; }
  s.active = s.active === "rome" ? "dacia" : "rome";
  if (s.active === "rome") s.turn += 1;
  checkOver(s);
  if (!s.over) log(s, s.active === "rome" ? `Turn ${s.turn}. Your orders, Legatus.` : "The Dacians move.", "system");
  return s.active;
}

export function sameHex(a: Hex, b: Hex): boolean {
  return same(a, b);
}
