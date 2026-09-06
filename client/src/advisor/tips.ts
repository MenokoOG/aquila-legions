import { FORMATIONS } from "../../../shared/data/formations.js";
import { distance } from "../hex.js";
import { type BattleState, type BattleUnit, isCore, unitsOf } from "../engine/battle.js";
import { forecast } from "../engine/forecast.js";
import { allProgress } from "../engine/objectives.js";
import {
  adjacentEnemies, effectiveMove, isFlanked, projectedReach, reachable, underMissileThreat,
} from "../engine/rules.js";

/**
 * The camp prefect: what an officer standing at your shoulder would say about
 * the board in front of you.
 *
 * Every tip is read off something the game already computes and already shows
 * somewhere — the threat overlay, the forecast panel, the objective list. The
 * adviser tells you nothing you could not have worked out, which is the whole
 * point: it is a teaching aid, not an oracle, and a player who stops reading it
 * has lost nothing but time.
 */

export interface Tip {
  /** Stable, so the panel can avoid re-announcing a tip that is still true. */
  id: string;
  /** Higher speaks first. */
  urgency: number;
  text: string;
  /** The unit the tip is about, so the panel can offer to select it. */
  unitId?: string;
}

const URGENT = 100;
const IMPORTANT = 60;
const USEFUL = 30;
const IDLE = 10;

/** The nearest a unit gets to breaking before the prefect starts saying so. */
const FRAGILE = 0.4;

function plural(n: number, one: string, many: string): string {
  return n === 1 ? `${n} ${one}` : `${n} ${many}`;
}

/** A cohort standing in the open under bows that a tortoise would answer. */
function underFire(s: BattleState): Tip[] {
  const out: Tip[] = [];
  for (const u of unitsOf(s, "player")) {
    if (!u.tmpl.canFormation || u.formation === "testudo") continue;
    if (!underMissileThreat(s, u)) continue;
    if (adjacentEnemies(s, u).length > 0) continue; // already at the sword; the tortoise cannot fight
    out.push({
      id: `testudo:${u.id}`,
      urgency: IMPORTANT,
      unitId: u.id,
      text: `${u.label} is in bow range in ${FORMATIONS[u.formation].name.toLowerCase()}. Testudo takes three quarters off what the arrows do.`,
    });
  }
  return out;
}

/** A cohort about to swing with its pila still on its shoulders. */
function pilaFirst(s: BattleState): Tip[] {
  const asked = s.scenario.objectives.some((o) => o.metric === "pilaSkipped");
  const out: Tip[] = [];
  for (const u of unitsOf(s, "player")) {
    if (!isCore(u) || u.pila <= 0 || u.acted) continue;
    if (!adjacentEnemies(s, u).length) continue;
    if (FORMATIONS[u.formation].blocksPila) {
      out.push({
        id: `pila-blocked:${u.id}`,
        urgency: USEFUL,
        unitId: u.id,
        text: `${u.label} is in contact and cannot throw from a tortoise. Drop to line first.`,
      });
      continue;
    }
    out.push({
      id: `pila:${u.id}`,
      urgency: asked ? URGENT : IMPORTANT,
      unitId: u.id,
      text: asked
        ? `${u.label} still has its pila and is in contact. Draw first and the volley objective fails for the whole battle.`
        : `${u.label} is in contact with its pila unthrown. The volley is free damage and draws no counter-attack.`,
    });
  }
  return out;
}

/** A blow that breaks them, or one that gets you broken. */
function blows(s: BattleState): Tip[] {
  const out: Tip[] = [];
  for (const u of unitsOf(s, "player")) {
    if (u.acted || u.tmpl.range > 0) continue;
    for (const t of adjacentEnemies(s, u)) {
      const f = forecast(s, u, t, "melee");
      if (f.risky) {
        out.push({
          id: `risky:${u.id}:${t.id}`,
          urgency: IMPORTANT,
          unitId: u.id,
          text: `${u.label} can charge ${t.label}, but the counter-attack could break ${u.label}. Soften them with someone else first.`,
        });
      } else if (f.breaks === "certain") {
        out.push({
          id: `kill:${u.id}:${t.id}`,
          urgency: IMPORTANT,
          unitId: u.id,
          text: `${u.label} breaks ${t.label} on any roll. Take it before they pull back.`,
        });
      }
    }
  }
  return out;
}

/** One more unit on that enemy and it is flanked. */
function flanks(s: BattleState): Tip[] {
  const out: Tip[] = [];
  for (const t of unitsOf(s, "enemy")) {
    if (FORMATIONS[t.formation].ignoresFlanking || isFlanked(s, t)) continue;
    if (adjacentEnemies(s, t).length !== 1) continue;
    const helper = unitsOf(s, "player").find((u) =>
      !u.moved && !u.acted && u.tmpl.range === 0 && distance(u.at, t.at) > 1
      && [...reachable(s, u).keys()].some((k) => {
        const [q, r] = k.split(",").map(Number) as [number, number];
        return distance({ q, r }, t.at) === 1;
      }));
    if (!helper) continue;
    out.push({
      id: `flank:${t.id}`,
      urgency: USEFUL,
      unitId: helper.id,
      text: `One unit already touches ${t.label}. ${helper.label} can reach it too, and a flanked enemy takes a third again as much.`,
    });
  }
  return out;
}

/** A cohort that should be walked out of the line before it breaks. */
function fragile(s: BattleState): Tip[] {
  const out: Tip[] = [];
  for (const u of unitsOf(s, "player")) {
    if (u.men / u.maxMen > FRAGILE) continue;
    const pressing = adjacentEnemies(s, u).length;
    if (!pressing) continue;
    out.push({
      id: `fragile:${u.id}`,
      urgency: isCore(u) ? URGENT : IMPORTANT,
      unitId: u.id,
      text: `${u.label} is down to ${Math.round(100 * u.men / u.maxMen)}% with ${plural(pressing, "enemy", "enemies")} on it. It routs under a quarter, and a routed cohort does not come back.`,
    });
  }
  return out;
}

/** Horsemen who will be on you next turn, and the circle that answers them. */
function horse(s: BattleState): Tip[] {
  const out: Tip[] = [];
  const riders = unitsOf(s, "enemy").filter((e) => e.tmpl.mounted && e.tmpl.chargeBonus > 1);
  if (!riders.length) return out;
  for (const u of unitsOf(s, "player")) {
    if (!u.tmpl.canFormation || u.formation === "orbis") continue;
    const coming = riders.filter((r) => reaches(s, r, u));
    if (!coming.length) continue;
    out.push({
      id: `orbis:${u.id}`,
      urgency: IMPORTANT,
      unitId: u.id,
      text: `${plural(coming.length, "horseman", "horsemen")} can reach ${u.label} next turn, and they hit hardest after a long run. Orbis cannot be flanked and takes a third less.`,
    });
  }
  return out;
}

function reaches(s: BattleState, attacker: BattleUnit, target: BattleUnit): boolean {
  if (distance(attacker.at, target.at) > effectiveMove(attacker) + 1) return false;
  return [...projectedReach(s, attacker).keys()].some((k) => {
    const [q, r] = k.split(",").map(Number) as [number, number];
    return distance({ q, r }, target.at) === 1;
  });
}

/** The lesson the scenario is here to teach, when it is the thing going wrong. */
function lesson(s: BattleState): Tip[] {
  const out: Tip[] = [];
  for (const p of allProgress(s)) {
    if (p.status !== "pending" || p.objective.compare === "victory") continue;
    // Only nag about a counter that has not started, and only once the battle is under way.
    if (p.objective.compare === "gte" && s.turn > 2) {
      out.push({
        id: `objective:${p.objective.id}`,
        urgency: USEFUL,
        text: `${p.objective.text} — ${p.detail}. ${p.objective.hint}`,
      });
    }
  }
  return out;
}

/** The clock. */
function clock(s: BattleState): Tip[] {
  const left = s.scenario.maxTurns - s.turn + 1;
  const standing = unitsOf(s, "enemy").length;
  if (left > 4 || standing === 0) return [];
  return [{
    id: "clock",
    urgency: left <= 2 ? URGENT : IMPORTANT,
    text: `${plural(left, "turn", "turns")} left and ${plural(standing, "enemy unit", "enemy units")} still standing. Night falling with the field uncleared is a defeat.`,
  }];
}

/** Nothing pressing, so say the thing worth knowing about the ground. */
function idle(s: BattleState): Tip[] {
  const waiting = unitsOf(s, "player").filter((u) => !u.moved && !u.acted).length;
  if (!waiting) return [];
  return [{
    id: "idle",
    urgency: IDLE,
    text: `${plural(waiting, "unit has", "units have")} orders left. Press Tab to step through them.`,
  }];
}

/**
 * Everything the prefect has to say, most urgent first. Pure: it reads the
 * battle and returns sentences, and nothing here changes the state.
 */
export function advise(s: BattleState): Tip[] {
  if (s.over || s.active !== "player") return [];
  return [
    ...fragile(s), ...pilaFirst(s), ...blows(s), ...underFire(s),
    ...horse(s), ...flanks(s), ...clock(s), ...lesson(s), ...idle(s),
  ].sort((a, b) => b.urgency - a.urgency);
}
