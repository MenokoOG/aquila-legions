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

One responsibility per file. The combat numbers live in `client/src/engine/rules.ts`; the roster in `shared/data/units.ts`; the battles in `shared/data/scenarios.ts`; the history in `shared/data/codex.ts`.

`rules.ts` keeps the damage formulas pure and separate from the dice, so `engine/forecast.ts` can show a prediction that cannot drift from the blow, and the tests can pin the roll and assert on the rules alone.

## Tests

```bash
npm test        # node:test over rules, forecast, objectives, progression, save file
npm run check   # typecheck both projects, then the tests
```

## Dependencies

Runtime: `express`. Dev: `vite`, `typescript`, `tsx`, `concurrently`, and the matching type packages. No database, no native modules.

## Accuracy note

Unit sizes follow the paper strength of a Trajanic legion. Attack and defense values are game balance, not history. Every Codex statement is something you can check in Cassius Dio, Vegetius, Josephus, or on Trajan's Column.
