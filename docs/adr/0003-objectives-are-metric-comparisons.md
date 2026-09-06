# 3. An objective is a comparison against a metric

Date: 2026-09-06

## Status

Accepted. Completes the piece ADR 0002 named and deliberately left undone.

## Context

`Objective` carried a `kind` from a closed nine-value union, and two files switched over it:

- `client/src/engine/objectives.ts` decided what the player saw in the sidebar during the fight.
- `server/progress.ts` decided what the fight was worth afterwards.

Different packages, no compiler link, the same nine cases written twice. Adding an objective meant editing a union in `shared/types.ts` and both switches, and nothing would have failed if the two had disagreed about what "met" meant. ADR 0002 left this alone because turning objectives into data alters a persisted shape and that refactor was held to a no-behaviour-change gate.

The Britannia campaign needs objective shapes this game has not used — hold a hex for N turns, extract a unit off the map edge, stay *under* a cap of your own doing — and every one of them would have cost two more switch cases in two packages.

## Decision

An objective is a comparison against a metric.

1. A battle publishes a `MetricBag`: every number it measures, by name, whether or not an objective asks about it. `client/src/engine/battle.ts:metrics()` builds it, and the same bag answers the live sidebar mid-battle and the server's scoring at the end. The two cannot drift because there is only one.
2. `Objective` is `{ id, text, metric, compare, value?, points, hint, outstanding? }`. `compare` is one of `victory`, `gte`, `lt`, `zero`.
3. `shared/objectives.ts` holds the only judge: `testObjective`, `objectiveMet`, `objectiveStatus`, `objectiveDetail`. Both packages import it. Both switches are gone.
4. `Objective.hint` — the line the after-action review shows when the objective was missed — moved from a branch in the client to the scenario data, beside the text it explains.

Two details worth naming.

**Status is decidable early because every metric only climbs.** A count that reaches its target can never fall back below it, so `gte` settles as `done` the moment it is reached. A cap that has been breached can never be un-breached, so `lt` and `zero` settle as `failed` immediately. What they cannot do is settle as *met* early, because there is usually still time to break them.

**`outstanding` is the exception, and it is why it exists.** "Every cohort throws its pila before it fights" is a `zero` on `pilaSkipped`, and under the rule above it would sit pending until the battle ended, even once every cohort had thrown and nothing was left that could break it. `outstanding: "cohortsYetToThrow"` names the work whose completion settles it. It is also what the live readout counts, since a failure metric sitting at zero says nothing about how far along you are.

## Alternatives considered

**Keep `kind` and share one switch from `shared/`.** Removes the duplication and nothing else. Every new objective still edits a union and a switch, which is the cost that mattered.

**A predicate function on each objective.** Most flexible, and it puts executable code in scenario data that must cross the wire to a server that scores with it. Rejected on the security boundary alone.

## Consequences

Objective ids are the old `kind` strings, exactly. `ScenarioRecord.objectivesMet` holds ids, so **every existing save keeps every objective it had already earned** and no migration was needed. An id that has shipped must never be renamed or reused: a renamed id reads as an objective the player has not met.

`BattleStats` is now `{ won, metrics }` rather than thirteen named fields, and it arrives over HTTP. `sanitizeStats` fills the bag out and cleans it the way `sanitizeSave` already treats the save file — whole, non-negative, nothing the game does not measure.

`Metric` is a hand-written union in `shared/types.ts`, deliberately, for the same reason `Formation` is: deriving it would make the type file depend on the engine, and that inversion is worse than one line per new measurement.

One behaviour changed, and it is an improvement. The pila objective used to go green as soon as every cohort had thrown, counting cohorts that had already died; it now counts only cohorts still standing that have yet to throw, and its readout says how many are left rather than how many have gone.

10 new tests over the comparator, the shape of the shipped objective data, and the posted report. 105 pass.
