import type {
  BattleStats, Campaign, Faction, Formation, Hex, MetricBag, Scenario, Side, Terrain, UnitPlacement,
  UnitTemplate,
} from "../../../shared/types.js";
import type { UnitKind } from "../../../shared/data/units.js";
import { UNITS } from "../../../shared/data/units.js";
import { campaignFor } from "../../../shared/data/campaigns.js";
import { key } from "../hex.js";
import { TERRAIN, isBlocked } from "../../../shared/data/terrain.js";

/** Battle state: the mutable in-memory model for one fight. No rendering, no network. */

export interface BattleUnit {
  id: string;
  side: Side;
  kind: UnitKind;
  label: string;
  tmpl: UnitTemplate;
  men: number;
  maxMen: number;
  formation: Formation;
  pila: number;
  at: Hex;
  moved: boolean;
  acted: boolean;
  movedDist: number;
}

export interface Trackers {
  /** Player units that walked off the board through an exit hex. */
  unitsExtracted: number;
  cohortsInMelee: Set<string>;
  cohortsThrown: Set<string>;
  pilaViolated: boolean;
  missileLosses: number;
  cuneusKills: number;
  flankKills: number;
  cavalryKills: number;
  cohortsRouted: number;
  testudoTurnsUnderFire: number;
  orbisHeldTurns: number;
  playerLosses: number;
  enemyLosses: number;
}

export interface LogLine {
  turn: number;
  side: Side | "system";
  text: string;
}

/** How the view learns about blows landed, without the rules knowing a canvas exists. */
export interface BattleListener {
  damage?: (target: BattleUnit, men: number, missile: boolean) => void;
  rout?: (victim: BattleUnit) => void;
}

/** Choosing the ground, then fighting on it. Most battles start already fought. */
export type BattlePhase = "deploy" | "battle";

export interface BattleState {
  scenario: Scenario;
  /** "deploy" only while the player is still setting the line out. */
  phase: BattlePhase;
  /** The era this fight belongs to. Supplies every name the player reads. */
  campaign: Campaign;
  units: BattleUnit[];
  turn: number;
  active: Side;
  log: LogLine[];
  track: Trackers;
  over: { won: boolean; reason: string } | null;
  listener?: BattleListener;
}

/** The other army. */
export function opposing(side: Side): Side {
  return side === "player" ? "enemy" : "player";
}

/** How this campaign refers to the given side. */
export function faction(s: BattleState, side: Side): Faction {
  return side === "player" ? s.campaign.player : s.campaign.enemy;
}

/**
 * A detached copy of the fight, for undo. The scenario and campaign are shared
 * (neither changes) and the listener is dropped so a restored state cannot fire
 * stale effects.
 */
export function cloneBattle(s: BattleState): BattleState {
  return {
    scenario: s.scenario,
    phase: s.phase,
    campaign: s.campaign,
    units: s.units.map((u) => ({ ...u, at: { ...u.at } })),
    turn: s.turn,
    active: s.active,
    log: s.log.map((l) => ({ ...l })),
    track: {
      ...s.track,
      cohortsInMelee: new Set(s.track.cohortsInMelee),
      cohortsThrown: new Set(s.track.cohortsThrown),
    },
    over: s.over ? { ...s.over } : null,
  };
}

/** A unit of the line, whose loss the campaign holds against you. */
export function isCore(u: BattleUnit): boolean {
  return u.tmpl.core;
}

export function terrainAt(s: BattleState, h: Hex): Terrain {
  return s.scenario.terrain[key(h)] ?? "plain";
}

/**
 * Terrain for a whole board as a flat array, cached per scenario.
 *
 * `terrainAt` builds a "q,r" string on every call, which the pathfinder was doing
 * for every neighbour of every hex it walked. A scenario's terrain is fixed for the
 * life of the battle, so it is laid out once and read by index after that.
 */
const TERRAIN_CACHE = new WeakMap<Scenario, Terrain[]>();

export function terrainGrid(scenario: Scenario): Terrain[] {
  const cached = TERRAIN_CACHE.get(scenario);
  if (cached) return cached;
  const grid: Terrain[] = new Array<Terrain>(scenario.width * scenario.height);
  for (let r = 0; r < scenario.height; r++) {
    for (let q = 0; q < scenario.width; q++) {
      grid[r * scenario.width + q] = scenario.terrain[`${q},${r}`] ?? "plain";
    }
  }
  TERRAIN_CACHE.set(scenario, grid);
  return grid;
}

/**
 * What each hex costs to enter, as a flat array, cached per scenario. `-1` is
 * ground nothing crosses.
 *
 * The pathfinder reads this for every neighbour of every hex it walks, and it
 * runs on every mouse move. Going through the terrain table there costs a
 * property lookup and a null check per step, which measured about 30% of the
 * walk once terrain stopped being "plain or not".
 */
const COST_CACHE = new WeakMap<Scenario, Int8Array>();

export function costGrid(scenario: Scenario): Int8Array {
  const cached = COST_CACHE.get(scenario);
  if (cached) return cached;
  const terrain = terrainGrid(scenario);
  const costs = new Int8Array(terrain.length);
  for (let i = 0; i < terrain.length; i++) costs[i] = TERRAIN[terrain[i]!].cost ?? -1;
  COST_CACHE.set(scenario, costs);
  return costs;
}

export function unitAt(s: BattleState, h: Hex): BattleUnit | undefined {
  return s.units.find((u) => u.at.q === h.q && u.at.r === h.r);
}

export function unitsOf(s: BattleState, side: Side): BattleUnit[] {
  return s.units.filter((u) => u.side === side);
}

export function log(s: BattleState, text: string, side: Side | "system" = s.active): void {
  s.log.push({ turn: s.turn, side, text });
  if (s.log.length > 200) s.log.shift();
}

export function createBattle(scenario: Scenario): BattleState {
  const units: BattleUnit[] = [];
  let n = 0;
  const place = (side: Side, list: UnitPlacement[]): void => {
    for (const p of list) {
      const kind = p.kind as UnitKind;
      const tmpl = UNITS[kind];
      if (!tmpl) throw new Error(`unknown unit kind ${p.kind}`);
      // A placement off the board indexes past the terrain grid and the
      // pathfinder walks into a hole. Scenario data is caught here, at load.
      if (p.at.q < 0 || p.at.q >= scenario.width || p.at.r < 0 || p.at.r >= scenario.height) {
        throw new Error(`${scenario.id} places ${p.kind} at ${p.at.q},${p.at.r}, off a ${scenario.width}x${scenario.height} board`);
      }
      if (isBlocked(scenario.terrain[key(p.at)] ?? "plain")) {
        throw new Error(`${scenario.id} places ${p.kind} on impassable ground at ${p.at.q},${p.at.r}`);
      }
      n += 1;
      units.push({
        id: `${side}-${n}`,
        side,
        kind,
        label: p.label ?? tmpl.name,
        tmpl,
        men: tmpl.men,
        maxMen: tmpl.men,
        formation: "line",
        pila: tmpl.pila,
        at: { ...p.at },
        moved: false,
        acted: false,
        movedDist: 0,
      });
    }
  };
  place("player", scenario.player);
  place("enemy", scenario.enemy);

  const state: BattleState = {
    scenario,
    phase: scenario.deployment ? "deploy" : "battle",
    campaign: campaignFor(scenario.campaignId),
    units,
    turn: 1,
    active: "player",
    log: [],
    track: {
      unitsExtracted: 0,
      cohortsInMelee: new Set(),
      cohortsThrown: new Set(),
      pilaViolated: false,
      missileLosses: 0,
      cuneusKills: 0,
      flankKills: 0,
      cavalryKills: 0,
      cohortsRouted: 0,
      testudoTurnsUnderFire: 0,
      orbisHeldTurns: 0,
      playerLosses: 0,
      enemyLosses: 0,
    },
    over: null,
  };
  log(state, `${scenario.title}, ${scenario.year}. ${state.campaign.player.plural} deploys.`, "system");
  return state;
}

/** How many of the scenario's key hexes a player unit is standing on. */
export function keyHexesHeld(s: BattleState): number {
  const held = new Set(unitsOf(s, "player").map((u) => key(u.at)));
  return (s.scenario.keyHexes ?? []).filter((h) => held.has(key(h))).length;
}

/**
 * Everything the fight has measured about itself, in the shape objectives are
 * written against. The same bag answers the live objective panel mid-battle and
 * the server's scoring at the end, so the two can never drift.
 */
export function metrics(s: BattleState): MetricBag {
  const t = s.track;
  return {
    enemiesLeft: unitsOf(s, "enemy").length,
    playerLosses: t.playerLosses,
    enemyLosses: t.enemyLosses,
    missileLosses: t.missileLosses,
    cuneusKills: t.cuneusKills,
    flankKills: t.flankKills,
    cavalryKills: t.cavalryKills,
    cohortsRouted: t.cohortsRouted,
    testudoTurnsUnderFire: t.testudoTurnsUnderFire,
    orbisHeldTurns: t.orbisHeldTurns,
    cohortsYetToThrow: unitsOf(s, "player").filter((u) => isCore(u) && !t.cohortsThrown.has(u.id)).length,
    pilaVolleys: t.cohortsThrown.size,
    keyHexesHeld: keyHexesHeld(s),
    unitsExtracted: t.unitsExtracted,
    // Turns the legion has stood, which is one fewer than the turn it is now on.
    turnsSurvived: s.turn - 1,
    pilaSkipped: t.pilaViolated ? 1 : 0,
    turns: s.turn,
  };
}

export function toStats(s: BattleState): BattleStats {
  return { won: s.over?.won ?? false, metrics: metrics(s) };
}
