# Aquila: Legions of Trajan

A local, single-player hex-tactics game about commanding Roman legions. Two campaigns, twelve battles, each built to teach one thing.

**The Dacian Wars (101 to 106 AD)** teach what the Imperial legion did well: the pilum volley, the testudo, the cuneus, the orbis, the auxiliary cavalry on the flank, and combined arms.

**The Boudican Revolt (60 to 61 AD)** unlocks after it, and teaches the thing those tools cannot supply: ground. Delay as a victory at Camulodunum, a column caught on the road, an evacuation, a defile chosen and held, Watling Street at ten to one, and a punitive winter you can fail by winning too hard. Four of its six battles are not won by clearing the field.

Win a battle and the history behind its tactic unlocks in the Codex. History points and rank persist between sessions.

The server is a small Express API on localhost that keeps one JSON save file. **Nothing leaves your machine unless you give it a key**: there is one optional feature, described below, that does — it is off by default, and the whole game is playable without it.

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
- The Praefectus panel on the right says the two or three things an officer would mention: form the tortoise, throw before you draw, that charge gets you broken, the horse arrives next turn. Press **Keep** on one to file it in your Commentarii. All of it is computed on your machine from the same formulas the forecast panel shows.
- Undo takes back orders within your own turn. Ending the turn commits: the Dacians move, and the dice are not re-rollable.
- Clearing the field is only one way to win. A battle may be won by lasting to the turn limit, by getting units off a marked exit, or by holding marked ground when the fighting stops. The briefing says which, and the board draws it: dashed green is ground to hold, gold is a way off the board.
- Some battles start by choosing where to stand. Deployment costs nothing and can be redone as often as you like; nothing moves until you set the line.

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

During deployment, `Tab` steps through the line, the arrows on each row move that unit along the zone, and `Enter` sets it.

## Layout

```
shared/          types and game data (units, terrain, scenarios, codex) used by both sides
server/          Express API: save store, progression rules, routes
client/src/      Vite app: hex math, battle engine, AI, canvas renderer, UI
test/            node:test suites over the rules, the forecast, and progression
data/save.json   your campaign (git-ignored)
```

One responsibility per file. The combat formulas live in `client/src/engine/rules.ts`; the formation numbers in `shared/data/formations.ts`; the rosters in `shared/data/units-*.ts`; the ground in `shared/data/terrain.ts`; the battles in `shared/data/scenarios-*.ts`; the history in `shared/data/codex.ts`.

### The Commentarii

Your notebook, on the campaign screen. Codex entries file themselves into it when you unlock them, and so do the notes that fire the first time you do a thing — the first pilum volley, the first tortoise under fire, the first wedge that breaks a line. Filter by tag, and export the lot as markdown: `GET /api/commentarii.md` writes a real file.

The notes live in `shared/data/triggers.ts` as data, and each one is a comparison against a battle metric judged by the same comparator the objectives use. Adding one is a row, not a branch.

### The enemy

`client/src/engine/ai/` decides the enemy's turn. It prices every option through `forecast`, the same pure formula your own forecast panel shows, so it cannot know a number you cannot see. The host picks one unit to break each turn, weighs every hex it could attack from — which is where flanking, the charge and the high ground come from, rather than from any rule about them — and, at the top level, waits for a neighbour instead of walking into the legion alone.

How well it fights is a property of the scenario (`shared/data/ai-levels.ts`), and the briefing names it. The first two battles are a probe. Sarmizegetusa is not.

### Adding a campaign

The engine deals in `player` and `enemy`. It does not contain the word "Dacia", and the combat rules do not know that cataphracts are cataphracts: a unit charges harder because of `chargeBonus` on its template, and a wedge hits harder because of `attackMul` in the formation table. A new era is therefore data, not an edit to the rules:

1. A record in `shared/data/campaigns.ts`, which supplies the names both armies are given on screen.
2. A roster file, `shared/data/units-<era>.ts`, imported into `shared/data/units.ts`. `UnitKind` is derived from what is there, so the type follows the data.
3. A scenario file, `shared/data/scenarios-<era>.ts`, imported into `shared/data/scenarios.ts`, with each battle carrying that `campaignId` and counting its own `order` from one. Codex entries go in `shared/data/codex.ts`.

Britannia was built that way and needed no edit to the combat rules. What it did need is in `docs/adr/0004-a-battle-is-not-always-won-by-clearing-the-field.md`: a scenario can carry its own victory condition, ground is a table, and a unit can be brittle.

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

## The Praefectus's voice (optional, off by default, costs money)

The advice above is written by a rules engine, and it reads like one. If you want it in the voice of a camp prefect, set an OpenAI key and a button appears in the panel:

```bash
# .env, which is git-ignored. The key is yours to place; nothing else touches it.
OPENAI_API_KEY=sk-...
```

**What it is allowed to do is narrow on purpose.** The local adviser decides what is *true*; the model only decides how it *sounds*. It is sent this turn's already-computed advice and nothing else — not the board, not the rules, not your save, not your name — and it is instructed to assert nothing it was not handed. It never writes history and it never gives orders.

That constraint is not about model size. A bigger model invents Roman history more fluently, not less, and every Codex statement in this game is meant to be checkable in Tacitus, Dio, Vegetius, Josephus or on Trajan's Column. Generated history would quietly void the one claim the project makes. See `docs/adr/0005-counsel-is-voice-only-and-optional.md`.

- One call per turn, fired by a button, never automatically. Six-second timeout, no retries.
- Model: `gpt-5.6-luna` on the Responses API, roughly $0.00015 a call. Override with `COUNSEL_MODEL`.
- Endpoint: override with `COUNSEL_URL` — which is also how you point it at a local model server instead.
- No key, a timeout, a rate limit, or anything unexpected: the button is not built, or the panel says so, and the local advice stands. A turn never waits on the network.

## Dependencies

Runtime: `express`, and nothing else — the optional counsel above is one `fetch` against one endpoint, not an SDK. Dev: `vite`, `typescript`, `tsx`, `concurrently`, and the matching type packages. No database, no native modules.

## Accuracy note

Unit sizes follow the paper strength of a Trajanic legion. Attack and defense values are game balance, not history. Every Codex statement is something you can check in Cassius Dio, Vegetius, Josephus, or on Trajan's Column.
