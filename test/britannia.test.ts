import { ok, strictEqual } from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import { TERRAIN } from "../shared/data/terrain.js";
import { UNITS } from "../shared/data/units.js";
import { CAMPAIGNS } from "../shared/data/campaigns.js";
import { SCENARIOS, scenariosOf } from "../shared/data/scenarios.js";
import { createBattle, metrics, unitsOf } from "../client/src/engine/battle.js";
import { enemyTurn } from "../client/src/engine/ai/index.js";
import {
  endTurn, melee, moveCost, moveUnit, reachable, victoryCondition, victoryMet,
} from "../client/src/engine/rules.js";
import { freshSave, isCampaignUnlocked, isUnlocked } from "../server/progress.js";
import {
  commitDeployment, inZone, isDeployed, place, stepPlacement, zone,
} from "../client/src/engine/deployment.js";
import { at, field, fixRoll } from "./helpers.js";

/**
 * The second campaign is mostly about things the first one never asked for:
 * ground you cannot cross, a battle won by lasting, a battle won by leaving,
 * and a host that comes apart when its front gives way. Each of those is a new
 * way for the engine to be wrong, so each is pinned here.
 */

describe("ground", () => {
  beforeEach(() => fixRoll(1));

  it("costs what the terrain table says, and shuts a crag entirely", () => {
    strictEqual(moveCost("plain"), 1);
    strictEqual(moveCost("road"), 1);
    strictEqual(moveCost("marsh"), 3);
    strictEqual(moveCost("cliff"), Infinity);
    for (const [name, def] of Object.entries(TERRAIN)) {
      ok(def.cost === null || def.cost >= 1, `${name} must cost at least a move point`);
      ok(def.blurb.length > 30, `${name} needs a line the field manual can print`);
    }
  });

  it("will not route a unit through a crag, however short the way looks", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      terrain: {
        "5,3": "cliff", "5,4": "cliff", "5,5": "cliff",
        "4,3": "cliff", "4,5": "cliff",
      },
    });
    const reach = reachable(s, at(s, 4, 4));
    for (const blocked of ["5,3", "5,4", "5,5", "4,3", "4,5"]) {
      ok(!reach.has(blocked), `walked onto ${blocked}, which is a crag`);
    }
  });

  it("makes the marsh dear and the road through it cheap", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 2, r: 4 } }],
      // (2,5) and (3,4) both touch (2,4) on an odd-r board; (4,4) is two marsh hexes away.
      terrain: { "3,4": "marsh", "4,4": "marsh", "2,5": "road" },
    });
    const reach = reachable(s, at(s, 2, 4));
    strictEqual(reach.get("3,4"), 3, "a marsh hex costs three");
    strictEqual(reach.get("2,5"), 1, "the road beside it costs one");
    ok(!reach.has("4,4"), "and three move points do not carry you through two of marsh");
  });
});

describe("winning by something other than the field", () => {
  beforeEach(() => fixRoll(1));

  it("defaults to clearing the field when a scenario says nothing", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 8, r: 4 } }],
    });
    strictEqual(victoryCondition(s).metric, "enemiesLeft");
    ok(!victoryMet(s));
    s.units = unitsOf(s, "player");
    ok(victoryMet(s));
  });

  it("wins a delaying battle by being alive at the end of the clock", () => {
    const s = field({
      maxTurns: 3,
      rome: [{ kind: "cohort", at: { q: 1, r: 1 } }],
      dacia: [{ kind: "warband", at: { q: 9, r: 7 } }],
    });
    s.scenario.victory = { metric: "turnsSurvived", compare: "gte", value: 3, text: "Hold until dark." };
    for (let i = 0; i < 8 && !s.over; i++) endTurn(s);
    ok(s.over?.won, `a battle meant to be survived was lost: ${s.over?.reason}`);
    ok(unitsOf(s, "enemy").length > 0, "and the enemy is still standing, which is the point");
  });

  it("takes a unit off the board at an exit, and counts it", () => {
    const s = field({ rome: [{ kind: "cohort", at: { q: 1, r: 4 } }] });
    s.scenario.exits = [{ q: 0, r: 4 }];
    s.scenario.victory = { metric: "unitsExtracted", compare: "gte", value: 1, text: "Get away." };

    const cohort = at(s, 1, 4);
    ok(moveUnit(s, cohort, { q: 0, r: 4 }));
    strictEqual(s.units.length, 0, "it walked off the board");
    strictEqual(metrics(s).unitsExtracted, 1);
    ok(s.over?.won, "and the last unit leaving is the win, not the army being destroyed");
  });

  it("counts only the key hexes a player unit is standing on", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      dacia: [{ kind: "warband", at: { q: 6, r: 4 } }],
    });
    s.scenario.keyHexes = [{ q: 4, r: 4 }, { q: 5, r: 4 }, { q: 6, r: 4 }];
    strictEqual(metrics(s).keyHexesHeld, 1, "the enemy standing on one does not hold it for you");
  });

  it("still loses when the clock runs out on a battle that had to be won outright", () => {
    const s = field({
      maxTurns: 2,
      rome: [{ kind: "cohort", at: { q: 1, r: 1 } }],
      dacia: [{ kind: "warband", at: { q: 9, r: 7 } }],
    });
    for (let i = 0; i < 8 && !s.over; i++) endTurn(s);
    strictEqual(s.over?.won, false);
  });
});

describe("a host that comes apart", () => {
  beforeEach(() => fixRoll(1));

  /** Two warhosts side by side, one already shaken, and a cohort about to break the other. */
  function line(shakenFraction: number) {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      dacia: [
        { kind: "britons_warhost", at: { q: 5, r: 4 } },
        { kind: "britons_warhost", at: { q: 6, r: 4 } },
      ],
    });
    const front = at(s, 5, 4);
    const behind = at(s, 6, 4);
    front.men = Math.floor(front.maxMen * 0.26);
    behind.men = Math.floor(behind.maxMen * shakenFraction);
    return { s, front, behind };
  }

  it("takes the shaken neighbour with it when the front breaks", () => {
    const { s, front, behind } = line(0.5);
    melee(s, at(s, 4, 4), front);
    ok(!s.units.includes(front), "the front went");
    ok(!s.units.includes(behind), "and the one beside it went with it");
  });

  it("leaves a neighbour that is still in good order", () => {
    const { s, front, behind } = line(1);
    melee(s, at(s, 4, 4), front);
    ok(!s.units.includes(front));
    ok(s.units.includes(behind), "a host at full strength does not break because its neighbour did");
  });

  it("does not spread through a unit that is not brittle", () => {
    const s = field({
      rome: [{ kind: "cohort", at: { q: 4, r: 4 } }],
      dacia: [
        { kind: "britons_warhost", at: { q: 5, r: 4 } },
        { kind: "iceni_nobles", at: { q: 6, r: 4 } },
      ],
    });
    const front = at(s, 5, 4);
    const nobles = at(s, 6, 4);
    front.men = Math.floor(front.maxMen * 0.26);
    nobles.men = Math.floor(nobles.maxMen * 0.3);
    melee(s, at(s, 4, 4), front);
    ok(!s.units.includes(front));
    ok(s.units.includes(nobles), "the queen's own were the last part of the host to break");
  });

  it("never takes the legion with it", () => {
    const s = field({
      rome: [
        { kind: "cohort", at: { q: 4, r: 4 } },
        { kind: "cohort", at: { q: 4, r: 5 } },
      ],
      dacia: [{ kind: "falxmen", at: { q: 5, r: 4 } }],
    });
    const victim = at(s, 4, 4);
    const neighbour = at(s, 4, 5);
    victim.men = Math.floor(victim.maxMen * 0.26);
    neighbour.men = Math.floor(neighbour.maxMen * 0.3);
    melee(s, at(s, 5, 4), victim);
    ok(!s.units.includes(victim));
    ok(s.units.includes(neighbour), "no Roman unit is brittle, and a cohort that holds holds");
  });
});

describe("the Britannia campaign", () => {
  const BRITANNIA = scenariosOf("britannia");

  it("ships six battles in order, each teaching something named", () => {
    strictEqual(BRITANNIA.length, 6);
    BRITANNIA.forEach((s, i) => {
      strictEqual(s.order, i + 1, `${s.id} is out of order`);
      ok(s.tactic.length > 4, `${s.id} does not say what it teaches`);
      ok(s.lesson.length > 80, `${s.id} needs a lesson worth reading`);
      ok(s.briefing.length > 80, `${s.id} needs a briefing`);
      ok(s.unlocksCodex.length > 0, `${s.id} unlocks no history`);
    });
  });

  it("places every unit on real ground, on the side that owns it", () => {
    for (const s of BRITANNIA) {
      for (const p of [...s.player, ...s.enemy]) {
        const tmpl = UNITS[p.kind as keyof typeof UNITS];
        ok(tmpl, `${s.id} places an unknown "${p.kind}"`);
        ok(p.at.q >= 0 && p.at.q < s.width && p.at.r >= 0 && p.at.r < s.height,
          `${s.id} places ${p.kind} off the board at ${p.at.q},${p.at.r}`);
      }
      for (const p of s.player) strictEqual(UNITS[p.kind as keyof typeof UNITS].side, "player", `${s.id}/${p.kind}`);
      for (const p of s.enemy) strictEqual(UNITS[p.kind as keyof typeof UNITS].side, "enemy", `${s.id}/${p.kind}`);
    }
  });

  it("marks key ground and exits on hexes that exist and can be stood on", () => {
    for (const s of SCENARIOS) {
      for (const h of [...(s.keyHexes ?? []), ...(s.exits ?? [])]) {
        ok(h.q >= 0 && h.q < s.width && h.r >= 0 && h.r < s.height, `${s.id} marks ${h.q},${h.r}, off the board`);
        const t = s.terrain[`${h.q},${h.r}`] ?? "plain";
        ok(TERRAIN[t].cost !== null, `${s.id} marks ${h.q},${h.r}, which nothing can walk onto`);
      }
    }
  });

  it("builds every battle without a placement error", () => {
    for (const s of BRITANNIA) {
      const battle = createBattle(s);
      ok(battle.units.length > 0);
      strictEqual(battle.campaign.id, "britannia");
    }
  });

  it("plays each one through to a decision with nobody at the controls", () => {
    fixRoll(1);
    for (const scenario of BRITANNIA) {
      const s = createBattle(scenario);
      commitDeployment(s);
      for (let turn = 0; turn < scenario.maxTurns + 2 && !s.over; turn++) {
        endTurn(s);
        for (const _ of enemyTurn(s)) { /* the generator does the work */ }
        if (s.over) break;
        endTurn(s);
      }
      ok(s.over, `${scenario.id} never reached a decision`);
    }
  });

  it("opens only after Dacia is finished, and then one battle at a time", () => {
    const save = freshSave();
    ok(isCampaignUnlocked(save, "dacia"));
    ok(!isCampaignUnlocked(save, "britannia"), "the second era waits on the first");
    ok(!isUnlocked(save, "camulodunum"));

    const lastDacian = scenariosOf("dacia").at(-1)!;
    save.scenarios[lastDacian.id] = { completed: true, bestPoints: 1, attempts: 1, objectivesMet: [] };
    ok(isCampaignUnlocked(save, "britannia"));
    ok(isUnlocked(save, "camulodunum"), "and its first battle opens");
    ok(!isUnlocked(save, "ninth"), "but not its second");

    save.scenarios.camulodunum = { completed: true, bestPoints: 1, attempts: 1, objectivesMet: [] };
    ok(isUnlocked(save, "ninth"));
  });

  it("counts each era from one without the two colliding", () => {
    for (const c of CAMPAIGNS) {
      const orders = scenariosOf(c.id).map((s) => s.order);
      strictEqual(new Set(orders).size, orders.length, `${c.id} repeats an order`);
      strictEqual(Math.min(...orders), 1, `${c.id} does not start at one`);
    }
    strictEqual(new Set(SCENARIOS.map((s) => s.id)).size, SCENARIOS.length, "two battles share an id");
  });
});

describe("choosing the ground", () => {
  beforeEach(() => fixRoll(1));

  function defile() {
    const scenario = SCENARIOS.find((x) => x.id === "defile")!;
    return createBattle(scenario);
  }

  it("opens in deployment only where a scenario asks for it", () => {
    strictEqual(defile().phase, "deploy");
    strictEqual(createBattle(SCENARIOS.find((x) => x.id === "watling")!).phase, "battle");
  });

  it("starts with the whole line inside its own zone", () => {
    const s = defile();
    ok(isDeployed(s), "a scenario that deploys must place its units somewhere legal to begin with");
    ok(zone(s).length >= unitsOf(s, "player").length, "there has to be room for everyone");
  });

  it("moves a unit anywhere free in the zone, and nowhere else", () => {
    const s = defile();
    const unit = unitsOf(s, "player")[0]!;
    const free = zone(s).find((h) => !s.units.some((u) => u.at.q === h.q && u.at.r === h.r))!;
    ok(place(s, unit, free));
    strictEqual(unit.at.q, free.q);

    const occupied = unitsOf(s, "player")[1]!.at;
    ok(!place(s, unit, occupied), "two units cannot stand on one hex");
    ok(!place(s, unit, { q: 11, r: 4 }), "and the zone is the zone");
  });

  it("steps along the line from the keyboard without ever landing on someone", () => {
    const s = defile();
    const unit = unitsOf(s, "player")[0]!;
    for (let i = 0; i < 12; i++) {
      stepPlacement(s, unit, 1);
      const here = s.units.filter((u) => u.at.q === unit.at.q && u.at.r === unit.at.r);
      strictEqual(here.length, 1, "stepped onto an occupied hex");
      ok(inZone(s, unit.at), "stepped out of the zone");
    }
  });

  it("will not run the battle until the line is set", () => {
    const s = defile();
    strictEqual(s.phase, "deploy");
    ok(commitDeployment(s));
    strictEqual(s.phase, "battle");
    ok(!commitDeployment(s), "and it only happens once");
  });
});
