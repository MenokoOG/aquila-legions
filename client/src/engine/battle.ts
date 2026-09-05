import type {
  BattleStats, Campaign, Faction, Formation, Hex, Scenario, Side, Terrain, UnitPlacement, UnitTemplate,
} from "../../../shared/types.js";
import type { UnitKind } from "../../../shared/data/units.js";
import { UNITS } from "../../../shared/data/units.js";
import { campaignFor } from "../../../shared/data/campaigns.js";
import { key } from "../hex.js";

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

export interface BattleState {
  scenario: Scenario;
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
    campaign: campaignFor(scenario.campaignId),
    units,
    turn: 1,
    active: "player",
    log: [],
    track: {
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

export function toStats(s: BattleState): BattleStats {
  const t = s.track;
  return {
    won: s.over?.won ?? false,
    turns: s.turn,
    playerLosses: t.playerLosses,
    enemyLosses: t.enemyLosses,
    pilaBeforeMelee: !t.pilaViolated,
    missileLosses: t.missileLosses,
    cuneusKills: t.cuneusKills,
    flankKills: t.flankKills,
    cavalryKills: t.cavalryKills,
    cohortsRouted: t.cohortsRouted,
    testudoTurnsUnderFire: t.testudoTurnsUnderFire,
    orbisHeldTurns: t.orbisHeldTurns,
  };
}
