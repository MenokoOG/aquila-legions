import type { BattleStats, Formation, Hex, Scenario, Side, Terrain, UnitKind, UnitTemplate } from "../../../shared/types.js";
import { UNITS } from "../../../shared/data/units.js";
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
  romanLosses: number;
  dacianLosses: number;
}

export interface LogLine {
  turn: number;
  side: Side | "system";
  text: string;
}

export interface BattleState {
  scenario: Scenario;
  units: BattleUnit[];
  turn: number;
  active: Side;
  log: LogLine[];
  track: Trackers;
  over: { won: boolean; reason: string } | null;
}

export function isLegionary(u: BattleUnit): boolean {
  return u.kind === "cohort" || u.kind === "first_cohort";
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
  const place = (side: Side, list: Scenario["rome"]) => {
    for (const p of list) {
      const tmpl = UNITS[p.kind];
      n += 1;
      units.push({
        id: `${side}-${n}`,
        side,
        kind: p.kind,
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
  place("rome", scenario.rome);
  place("dacia", scenario.dacia);

  const state: BattleState = {
    scenario,
    units,
    turn: 1,
    active: "rome",
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
      romanLosses: 0,
      dacianLosses: 0,
    },
    over: null,
  };
  log(state, `${scenario.title}, ${scenario.year}. The legion deploys.`, "system");
  return state;
}

export function toStats(s: BattleState): BattleStats {
  const t = s.track;
  return {
    won: s.over?.won ?? false,
    turns: s.turn,
    romanLosses: t.romanLosses,
    dacianLosses: t.dacianLosses,
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
