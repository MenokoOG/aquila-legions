# Aquila: Legions of Trajan

A local, single-player hex-tactics game about commanding Roman legions in the Dacian Wars (101 to 106 AD). Six battles, each built to teach one thing the Imperial legion did well: the pilum volley, the testudo, the cuneus, the orbis, the auxiliary cavalry on the flank, and combined arms. Win a battle and the history behind its tactic unlocks in the Codex. History points and rank persist between sessions.

Nothing leaves your machine. The server is a small Express API on localhost that keeps one JSON save file.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on port 3117; Vite proxies `/api` to it.

For a single-process build:

```bash
npm run start
```

Then open http://localhost:3117.

## Play

- Click a Roman unit. Gold hexes are where it can move, and hovering one draws the route it would walk. Red rings are melee targets, orange rings are ranged targets.
- Hover an enemy you can reach and the sidebar shows the forecast: how many men each side stands to lose, whether the blow breaks them, and whether the counter-attack could break you. The numbers come from the same formulas the fight uses.
- Legionary cohorts can change formation before they move: Line, Testudo, Cuneus, Orbis. Each is a real trade.
- Cohorts carry pila. Select "Throw pila" and click an adjacent enemy. Once per battle, no retaliation. Throw first, then fight.
- A unit that drops under a quarter of its men routs. Flanked units (two or more enemies adjacent) take extra damage; Orbis cannot be flanked.
- The objective list tracks itself as you play, so you can see the lesson landing or slipping before the battle is over.
- Undo takes back orders within your own turn. Ending the turn commits: the Dacians move, and the dice are not re-rollable.
- Clear the field before the turn limit.

### Keys

| Key | Order |
| --- | --- |
| `Enter` / `Space` | End turn |
| `Tab` / `N` | Next cohort with orders left |
| `1` `2` `3` `4` | Line, Testudo, Cuneus, Orbis |
| `A` / `P` | Gladius or pila |
| `U` / `Ctrl+Z` | Undo |
| `Esc` | Deselect |
| `L` | Briefing and lesson |

## Layout

```
shared/          types and game data (units, scenarios, codex) used by both sides
server/          Express API: save store, progression rules, routes
client/src/      Vite app: hex math, battle engine, AI, canvas renderer, UI
test/            node:test suites over the rules, the forecast, and progression
data/save.json   your campaign (git-ignored)
```

One responsibility per file. The combat formulas live in `client/src/engine/rules.ts`; the formation numbers in `shared/data/formations.ts`; the rosters in `shared/data/units-*.ts`; the battles in `shared/data/scenarios.ts`; the history in `shared/data/codex.ts`.

### Adding a campaign

The engine deals in `player` and `enemy`. It does not contain the word "Dacia", and the combat rules do not know that cataphracts are cataphracts: a unit charges harder because of `chargeBonus` on its template, and a wedge hits harder because of `attackMul` in the formation table. A new era is therefore data, not an edit to the rules:

1. A record in `shared/data/campaigns.ts`, which supplies the names both armies are given on screen.
2. A roster file, `shared/data/units-<era>.ts`, imported into `shared/data/units.ts`. `UnitKind` is derived from what is there, so the type follows the data.
3. Scenarios in `shared/data/scenarios.ts` carrying that `campaignId`, and codex entries in `shared/data/codex.ts`.

`test/campaign.test.ts` guards those seams: it fails if a scenario points at a campaign that does not exist, places a unit the roster does not have, or puts a unit on the wrong side. The reasoning behind the split is in `docs/adr/0002-campaign-registry-and-generic-sides.md`.

`rules.ts` keeps the damage formulas pure and separate from the dice, so `engine/forecast.ts` can show a prediction that cannot drift from the blow, and the tests can pin the roll and assert on the rules alone.

## Tests

```bash
npm test        # node:test over rules, forecast, objectives, progression, save file
npm run check   # typecheck both projects, then the tests
npm run bench   # timings for the hot paths behind a mouse move
```

`test/perf-parity.test.ts` keeps the pre-speedup pathfinder and hex picker as reference oracles. Anything that makes the board faster has to keep giving the same answers, and that suite is what says so.

For drawing cost, which Node cannot measure, open the battle screen with `?perf=1` (for example http://localhost:3117/?perf=1). The strip under the board then reports median and p95 for the board repaint and the threat map.

## Dependencies

Runtime: `express`. Dev: `vite`, `typescript`, `tsx`, `concurrently`, and the matching type packages. No database, no native modules.

## Accuracy note

Unit sizes follow the paper strength of a Trajanic legion. Attack and defense values are game balance, not history. Every Codex statement is something you can check in Cassius Dio, Vegetius, Josephus, or on Trajan's Column.
