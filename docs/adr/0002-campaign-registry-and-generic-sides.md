# 2. The engine deals in player and enemy, not in Rome and Dacia

Date: 2026-09-05

## Status

Accepted.

## Context

`Side` was `"rome" | "dacia"`, and those two strings had leaked out of the display layer into behaviour. The rules picked which loss tally to add to by comparing against `"dacia"`. `checkRout` only credited a kill when the victim was Dacian. `rangedTargets` flipped the two strings by hand to find the other army. The AI file was called the Dacian side and had a function named `nearestRoman`. Ten files named one or both peoples.

Three more things were closed in the same way. `UnitKind` was a ten-value union written out by hand, so a new army meant editing a type. Formation behaviour lived as literals inside `rules.ts` (`if (a.formation === "cuneus") m *= 1.4`), so a new formation meant editing combat. Unit behaviour was matched on kind, so cataphracts charged harder because the rules knew their name.

A second campaign is planned. Under all of this, adding one meant editing the rules rather than adding data, and the third campaign would cost the same again.

## Decision

The engine no longer knows who is fighting.

1. `Side` is `"player" | "enemy"`. A `Campaign` record supplies the words the player reads: `name`, `adjective` and `plural` per side, so the battle log still says "The Dacians move." while nothing in `rules.ts` contains the string.
2. `UnitKind` is derived from the roster files (`keyof typeof UNITS`) rather than declared. A campaign adds `units-<era>.ts` and imports it into the barrel; the type follows the data, and strict typing is kept.
3. Formations are data. `FormationDef` holds `attackMul`, `defenseMul`, `missileMul`, `moveOverride`, `ignoresFlanking` and `blocksPila`. Every one of those numbers was previously a literal in a branch inside `rules.ts`.
4. Unit behaviour that the rules used to match on kind is now a trait on the template: `core` (a unit of the line, whose loss counts against you), `mounted`, `chargeBonus`, `armourPiercing`, `missileVerb`.

The player commands Rome in every planned campaign, so `isLegionary` became `isCore` reading `tmpl.core` rather than disappearing.

## Alternatives considered

Widen the union to `"rome" | "dacia" | "britannia"`. Cheaper on the day, and it pushes the same cost onto every campaign after: `rangedTargets` grows a table of who fights whom, and each new era touches the rules again. Rejected.

## Consequences

Adding an era is now a data change: a campaign record, a roster file, scenario files, codex entries. The rules are not edited.

The behaviour is unchanged, and that was the gate this refactor was held to. All 74 existing tests pass with no expectation altered; the only edits to test files are renames (`romanLosses` to `playerLosses`, `"dacia"` to `"enemy"`) and one added `campaignId` in the fixture.

Two costs we accepted. `Formation` stays a hand-written union in `types.ts` rather than being derived like `UnitKind`, because deriving it would make `types.ts` depend on `data/`, and inverting that dependency is worse than one line per new formation. And `Objective` still carries a closed `ObjectiveKind` union switched on in two places, `client/src/engine/objectives.ts` and `server/progress.ts`. That duplication is real and is not fixed here; it is deliberately left for its own change, because turning objectives into metric comparisons alters a persisted shape and could not be done under this refactor's no-behaviour-change gate.
