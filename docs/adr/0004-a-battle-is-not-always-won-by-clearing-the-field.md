# 4. A battle is not always won by clearing the field

Date: 2026-09-06

## Status

Accepted.

## Context

Every battle in the game was won the same way: destroy or rout every enemy unit before the turn limit. `checkOver` said so directly, and the turn limit expiring was always a defeat.

The second campaign is the Boudican Revolt, and it does not work that way. Its first battle is a delaying action at Camulodunum where nobody expects the defenders to win; its second is Legio IX caught in column on the road, where the goal is to get some of it out; its third is the evacuation of London. Tacitus's account of the campaign turns on Paulinus abandoning a town he could not hold and then choosing a defile he could, and the last of the six is a punitive sweep the Romans arguably lost by winning too hard, which got Paulinus recalled.

None of those is "kill everyone". Encoding them meant either a `VictoryKind` union with a switch in `checkOver` — the shape ADR 0003 had just removed for objectives — or making winning the same kind of thing an objective already is.

## Decision

A scenario's victory is a comparison against a battle metric, in the same shape as an `Objective` and judged by the same comparator.

```ts
victory?: { metric: Metric; compare: Compare; value?: number; text: string }
```

Absent means the old rule: `enemiesLeft` is zero. The six Britannia battles use `turnsSurvived >= 8`, `unitsExtracted >= 3`, `unitsExtracted >= 2`, the default, `enemiesLeft < 3`, and the default again.

Three things follow from that.

**The win is tested before the wipe.** A scenario won by getting away ends with no player units on the board, which the old order would have read as an army destroyed.

**The turn limit is no longer a defeat by itself.** It is a defeat only if the victory condition is not met when it arrives, which is exactly what makes a delaying action winnable.

**`compare: "victory"` on an objective now means "the battle was won", not "the field is clear."** It used to test `enemiesLeft === 0`, which was the same thing when there was only one way to win and silently wrong once there were several — at Watling Street, where the win is `enemiesLeft < 3`, the player would have taken the field and been paid nothing for it. A test now asserts that every scenario pays for its own win.

Two supporting mechanics came with it, both data rather than rules.

**Terrain is a table** (`shared/data/terrain.ts`), with `cost: number | null` where `null` is impassable, and a defence multiplier. `moveCost` and `terrainDefense` were two small `if` chains in `rules.ts`. Marsh costs 3, road costs 1, crag costs nothing because nothing crosses it. A campaign whose lesson is the ground it was fought on has to be able to add ground without editing combat.

**A unit can be brittle** (`UnitTemplate.brittle`), and when a brittle unit's neighbour breaks, it goes too if it is already below 60%. Tacitus describes Boudica's host coming apart at once when the front gave way, penned against its own wagon line. That is a trait on the warhost, the chariots and the slingers, and not on the Iceni nobles or on anything Roman — so the cascade is something the roster says, not something the rules know about Britons.

## Alternatives considered

**A `VictoryKind` union switched on in `checkOver`.** Four cases today and a fifth for every scenario shape a later campaign wants. It is the duplicated-switch problem ADR 0003 removed, reintroduced one layer down.

**A predicate function per scenario.** Most expressive, and it puts executable code in scenario data. Rejected for the same reason as in ADR 0003.

**Rout cascade as a scenario flag.** Simpler to write and wrong: it would mean the same warhost breaks differently depending on which battle it is in.

## Consequences

The turn limit means something different in each battle, so the briefing now states the victory condition in words and the board draws the ground the scenario is about — key hexes in dashed green, exits in gold. A win condition the player has to infer is not a win condition.

Deployment (`client/src/engine/deployment.ts`) adds a `phase` to `BattleState`. `endTurn` refuses to run while the phase is `deploy`, in the engine rather than only in the screen, so the rule holds for anything that drives the game. The plan for this called for server-side validation of placements; it is not needed and was not added, because after ADR 0003 the battle report is a bag of metrics and the server never sees a position.

`Metric` gained `keyHexesHeld`, `unitsExtracted` and `turnsSurvived`. `Scenario` gained `victory`, `keyHexes`, `exits`, `deployment` and `formations`, all optional, so the Dacian scenarios are unchanged.

Scenario `order` is now a position within a campaign rather than across the game, and `isUnlocked` reads the campaign a scenario belongs to. A campaign opens when the last battle of the previous one is won.

The pathfinder reads the cost of a hex on every step of every walk, and going through the terrain table there cost about 30% of the walk. Costs are laid out once per scenario as an `Int8Array` beside the terrain grid, which put the numbers back where they were before this change.
