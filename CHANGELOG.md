# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — the page says when the server is older than it is

`express.static` reads `dist/` from disk per request, so a server left running across a `git pull` serves the rebuilt page off the rules it loaded at startup. The result is a current screen against a stale API — a campaign the client would happily draw that the server never mentions, a save version it rejects, a route that 404s — and nothing anywhere says so. It reads as a bug in the feature.

The bundle is stamped with its build time (`__BUILT_AT__`, set in `client/vite.config.ts`), `GET /api/state` reports when the process loaded its code, and a banner appears if the second is earlier than the first.

It only catches a server new enough to send the stamp, so it cannot catch the case that prompted it — a process predating the feature has nothing to report. It stops the next one.

- `client/src/ui/staleBanner.ts`, and 5 tests over it, including that the banner never stacks on a reload and that it sits above whatever was already on the page. 217 pass.

### Fixed

- **The commander row's last button was clipped.** Adding the Commentarii button was not the cause; moving the row inside `.scenario-list` was. That list is a `repeat(auto-fill, minmax(360px, 1fr))` grid, so a flex row whose buttons push right became one narrow cell and Reset fell off the end of it. The row is a sibling of the grid again.
- **A locked era read as missing rather than locked.** The tab was being rendered all along, but `.btn:disabled` put it at 45% opacity, and a panel-coloured chip with a 30%-alpha gold border at 45% opacity is nothing at all against a near-black ground. It is dimmed by colour now — dashed border, muted text, both above AA — and it says the word "locked" rather than relying on the colour to carry it.
- A locked era tab is no longer `disabled`. A disabled control cannot be focused, so nobody could ask it why it was shut. It is focusable, marked `aria-disabled`, and clicking it says what would open it.

### Changed — the Codex is organised by era

One flat grid was fine for thirteen entries. There are twenty-six now, plus seventeen units, five formations and seven kinds of ground, and it had become a wall.

- History is grouped into a section per era, unlocked entries first within each, with a count.
- A chip row filters the screen to one era. The legion stays on show whatever is filtered, because it is in every era.
- The field manual gained a **Ground** section — what each terrain costs to enter and what it is worth to stand on, which the game had nowhere stated — and units are grouped by the roster they come from rather than listed in one run. Unit cards now show mounted, formations and brittle rather than only the numbers.
- Which era an entry belongs to is derived from the battle that unlocks it (`CODEX_CAMPAIGN`), not written on the entry, so there is one place to get it wrong instead of two.

### Added

- `AQUILA_UNLOCK_ALL=1` opens every battle and era, for working on a later one without playing six to reach it. Off unless set, never written to the save, and it changes nothing about scoring.
- `test/dom-stub.ts` and `test/screens.test.ts`: enough DOM to build a screen in Node, and 12 tests that walk the result. Both bugs above shipped because no test could reach a rendered screen — a typechecker cannot see a button in the wrong container. Reintroducing either bug fails these tests.
- `test/codex.test.ts`: 12 tests that every entry has exactly one battle unlocking it, that every entry files under a real era with none left over, that an era's entries come back in the order its battles unlock them, and that the field manual shows every unit the game has rather than the ones somebody remembered to list.

### Added — the Praefectus borrows a voice (optional, off by default)

The local adviser is correct, free and instant, and it reads like a rules engine, because it is one. With an `OPENAI_API_KEY` in the environment, a button in the panel asks a model to say the same thing in the voice of a camp prefect.

**Facts in, prose out.** `client/src/advisor/tips.ts` decides what is true. The model is sent those already-true sentences and nothing else — not the board, not the rules, not the save, not the commander's name — and is instructed to assert nothing it was not handed. It picks the one or two that matter this turn and phrases them. It never writes history and never gives orders.

That constraint is not about model size. A larger model invents Roman history more fluently, not less, and every Codex statement in this game is meant to be checkable in Tacitus, Dio, Vegetius, Josephus, Caesar or on Trajan's Column. Generated history would quietly void the only claim the project makes, and nobody would notice — which is what makes it the failure worth designing against. See `docs/adr/0005-counsel-is-voice-only-and-optional.md`.

- `POST /api/counsel`. No key: 501, `GET /api/state` reports `counsel: false`, and the client never builds a button that cannot work.
- `gpt-5.6-luna` on the Responses API, about $0.00015 a call at roughly 400 in and 60 out. `COUNSEL_MODEL` and `COUNSEL_URL` override the model and the endpoint — the second is how the whole path is tested against a stub, and how you would point it at a local model server instead.
- **No new dependency.** One endpoint, one POST, `fetch`. `express` is still the only runtime dependency.
- Six-second timeout, zero retries, one call per turn, fired by a button, never automatically. The advice clears when the turn ends, because it was about the board as it stood.
- The reply is rendered with `textContent` and cut at 400 characters. Model output never touches `innerHTML`.

**Failure is the default rendering.** The local tips are what the panel shows — before the request, during it, and after it fails. Counsel appears beneath them when it arrives. There is no state in which a turn waits on the network, and none in which a failure costs anything but the phrasing.

### Changed

- **The README no longer says nothing leaves your machine**, because with a key that is not true. It says the game is fully playable with no key and no network, and that one optional button sends this turn's already-computed advice to be rephrased. This is the change that made the old sentence a lie, so it is the change that carries the ADR.

### Added

- `test/counsel.test.ts`: 18 tests, none of which call the real API — every one injects a fetcher. No key, empty facts, a refused status, a dead network, a timeout, four reply shapes nobody expected, and an assertion that no field of the save travels with the ask. 188 pass.

### Added — Britannia: the Boudican Revolt

A second era, six battles, 60 to 61 AD. It unlocks when the Dacian Wars are finished, and the campaign screen now has a tab per era.

Dacia teaches the legion's offensive tools: the volley, the tortoise, the wedge, the circle. Britannia teaches the thing those cannot supply, which is ground. Four of its six battles are not won by clearing the field.

| # | Battle | Teaches | Won by |
|---|---|---|---|
| 1 | The Temple of Claudius | Delay is a victory | Lasting eight turns with the podium still held |
| 2 | The Ninth on the Road | A column is not a line | Getting three units off the western road |
| 3 | Londinium Given Up | Escort under pressure | Both parties of refugees reaching the exits |
| 4 | Choosing the Ground | Frontage and flank security | Breaking them in the gap you picked |
| 5 | Watling Street | Everything, at ten to one | Breaking the host, not killing it |
| 6 | The Winter Sweep | When to stop | Clearing the bands — and killing fewer than 900 doing it |

Scenario 6 is Paulinus's punitive winter, the one that had Classicianus writing to Nero and got Paulinus recalled. Its main objective is a cap: you fail it by winning too hard. It is the only objective in the game that works that way, and it costs nothing new in the engine, because a cap is a comparison and objectives have been comparisons since the change above.

**New units.** The British Warhost (900 men, poor, and the least steady thing on the board), Iceni Nobles, War Chariots, British Slingers, the Wagon Line, and on the Roman side the Colonia Veterans and the Londinium Refugees, who cannot fight at all.

**New ground.** Marsh costs 3 to enter and takes 10% off the defence of anything standing in it. Road costs 1, which matters only where it is the one dry line through a marsh — which is the whole shape of the second battle. Crag is impassable, and a flank resting on one cannot be turned. Terrain is a table now (`shared/data/terrain.ts`) with a cost and a defence multiplier; `moveCost` and `terrainDefense` were two `if` chains inside the combat rules.

**New formation.** Marching Column: move 5 on any ground, a little over half defence, and half again as much damage from missiles. Offered only in the battle that teaches it, because a scenario now names the formations its orders panel carries.

**Thirteen codex entries**, from Boudica and the burn layers under Colchester, London and St Albans to Poenius Postumus falling on his sword and Classicianus's tombstone in the British Museum. Where Tacitus gives a figure, the entry says it is a figure from a source rather than a count.

### Changed — a battle is not always won by clearing the field

`checkOver` said victory was an empty enemy list and the turn limit was always a defeat. A scenario now carries a victory condition in the same shape as an objective, judged by the same comparator, and absent means the old rule. See `docs/adr/0004-a-battle-is-not-always-won-by-clearing-the-field.md`.

- The win is tested before the wipe, because a battle won by getting away ends with no player units on the board.
- The turn limit is a defeat only if the condition is unmet when it arrives, which is what makes a delaying action winnable.
- `compare: "victory"` on an objective now means the battle was won rather than the field being clear. It tested `enemiesLeft === 0`, which was the same thing when there was one way to win and quietly wrong once there were several: at Watling Street the player would have taken the field and been paid nothing. A test now asserts every scenario pays for its own win.
- The briefing states the victory condition in words, and the board draws the ground the scenario is about — dashed green for hexes that have to be held, gold EXIT for a way off the board. A win condition the player has to infer is not a win condition.

### Added — choosing the ground

`Choosing the Ground` opens in a deployment phase: no clock, no enemy, and as many changes of mind as you like before you say the line is set. Fully keyboard-driven — Tab through the line, arrows step a unit along the zone, Enter sets it — and clickable for anyone who would rather point at a hex. `endTurn` refuses to run while a battle is still deploying, in the engine rather than only in the screen.

### Added — a host that comes apart

A unit can be `brittle`, and a brittle unit whose neighbour breaks goes with it if it is already under 60%. Tacitus has Boudica's host come apart at once when the front gave way, penned against the wagon line its own families had drawn up behind it. The warhost, the chariots and the slingers are brittle; the Iceni nobles are not, and nothing Roman is. It is a number on a template, not a rule about Britons.

### Changed

- Scenario `order` is a position within its campaign rather than across the game. `isUnlocked` reads the campaign a scenario belongs to, and a campaign opens when the last battle of the one before it is won.
- Scenario data split per era: `shared/data/scenarios-dacia.ts`, `shared/data/scenarios-britannia.ts`, assembled by `scenarios.ts`. Same shape as the rosters.
- `createBattle` now refuses a placement that is off the board or on impassable ground. The old code read a hole in the terrain grid as ordinary rough going, which is how a unit placed off the edge of a test board went unnoticed.

### Performance

The pathfinder reads a hex's cost on every step of every walk, and once terrain stopped being "plain or not" that lookup measured about 30% of it (`reachable` 6.1 to 8.0 µs). Costs are now laid out once per scenario as an `Int8Array` beside the terrain grid. Measured on the same board and machine as the last round:

| | before Britannia | with terrain, uncached | now |
|---|---|---|---|
| `reachable`, one unit | 6.1 µs | 8.0 µs | 6.2 µs |
| `pathTo`, one hover | 6.2 µs | 9.3 µs | 6.1 µs |
| `threatMap`, after every order | 177.4 µs | 228.4 µs | 174.6 µs |

### Added

- `test/britannia.test.ts`: 24 tests over impassable ground and what the marsh and the road cost, the three new ways to win, the rout cascade in both directions, the deployment phase, campaign unlocking, and a headless playthrough of all six battles.

### Added — the Praefectus and the Commentarii

Two things, both local, both deterministic. There is no model anywhere in this and nothing leaves the machine.

**The Praefectus** is a camp prefect at your shoulder: two or three sentences in the right-hand column about the board as it stands. A cohort in bow range that a tortoise would answer. A cohort in contact with its pila unthrown, and what that costs the volley objective. A charge whose counter-attack could break the unit making it. Horsemen who can reach you next turn, and the circle that answers them. A cohort down where routing becomes likely. The clock, when the field is not clear and there is not much of it left.

Every tip is read off something the game already computes and already shows somewhere — `threatMap`, `forecast`, `objectiveProgress`. The adviser tells you nothing you could not have worked out, which is the point: it is a teaching aid, not an oracle, and it is pure, so it is testable.

**The Commentarii** is the notebook. Three things file into it:

- **Knowledge triggers**, the moment they happen. The first pilum volley, the first tortoise under fire, the first wedge that breaks a line, the first flank kill, the first cohort lost — each writes a short historical note while the board still shows what the sentence is about. A corner notice says one arrived; nothing is blocked and no turn is interrupted. The Codex unlocks at the end of a battle, which is the wrong moment for a fact about a thing you just did for the first time.
- **Codex entries**, on unlock, so everything the campaign has taught you is in one place.
- **Tips you keep**, by pressing Keep on one.

A trigger is a comparison against a battle metric, judged by the same comparator objectives use, so a note is data (`shared/data/triggers.ts`) rather than a branch in the engine. Notes fire once per campaign, not once per battle. Every claim in one is checkable in Dio, Vegetius, Josephus, Tacitus, Ammianus, Caesar, or on Trajan's Column, per the accuracy rule this game is held to.

The screen filters by tag and exports the whole notebook as markdown from `GET /api/commentarii.md` — a real file, because the rule this project is built to says anything worth keeping is a file in a repository.

### Changed

- **The save is version 2.** It gained `commentarii` and nothing else. `sanitizeSave` migrates a v1 file on read, keeping every point, objective and codex entry it had. Because a v1 build meeting a v2 file would reject it and start a fresh campaign, `SaveStore` copies the file to `save.json.v1.bak` once, before the first v2 write. The way back is a file copy.
- The notebook is written by the client, so it is cleaned on the way in like everything else that crosses the wire: an entry without an id or a title is dropped, the same id is never filed twice, an unknown source becomes a tip rather than being believed, and a scenario id the game does not have is blanked.

### Added

- `test/advisor.test.ts`: 16 tests. Each puts the board in the state a tip is about and asks for the tip — and, as often, puts it one step past that and checks the tip has stopped.
- `test/commentarii.test.ts`: 12 tests over the v1 to v2 migration, the backup, filing, and the markdown export. 145 pass.

### Changed — the enemy fights

`enemyTurn` was 95 lines of greedy per-unit behaviour: sort by role, walk at the nearest Roman, swing at whoever is adjacent. It was readable and it was exploitable — every scenario solved the same way, by baiting one warband at a time onto a cohort of your choosing. The host now plans as a host. `client/src/engine/ai/` replaces `client/src/engine/ai.ts`: `evaluate.ts` prices a blow or a hex, `act.ts` takes one unit's turn, `index.ts` runs the host's.

- **Everything is priced through `forecast`**, the same pure formula the player's own forecast panel shows. The AI cannot know a number the player cannot see, and it cannot hold an opinion the combat code disagrees with. A tortoise is a poor target because the missile multiplier says so, not because a line of code says archers dislike tortoises.
- **The host picks one unit to break each turn** — the one it can hurt most, summed over every unit that can reach it. Convergence, weakness and softness are all already inside that sum, so nothing weighs them separately, and the host will not agree to concentrate on something it cannot actually hurt. It is a preference, not an order: a unit with a plainly better blow in front of it takes that one.
- **Flanking, the charge and higher ground are emergent, not scripted.** A unit weighs every hex it could attack from, with the rules asked as though it were already standing there. Coming round to the side of a cohort scores better because `attackMultiplier` says a flanked target takes 30% more, and a cataphract crosses two hexes because that is what `chargeBonus` pays for. There is no flanking rule in the AI.
- **It will not feed itself to you piecemeal.** A unit that would walk into contact alone waits for a neighbour instead. Bounded deliberately, because a stalled battle is an enemy win: holding stops the moment anyone is in contact, and stops for everyone at the halfway turn.
- **A veteran host counts the counter-attack** and declines a trade that costs more than it wins, so a broken warband no longer throws its last men at a first cohort for eleven casualties.
- **Archers step out of a sword fight before shooting** instead of loosing arrows at the man hitting them.
- **The enemy's calibre is a property of the scenario, and the briefing names it.** `raw` for the first two battles (they come straight at you), `seasoned` for the middle two, `veteran` for the Roxolani and Sarmizegetusa. A lesson you are still learning should not be examined by the best opponent in the game. The table is data, in `shared/data/ai-levels.ts`.

A whole enemy turn costs 1.0 ms on average and 1.5 ms at worst on Sarmizegetusa, the biggest board the game ships — 19 units and roughly 250 forecasts. It runs once a turn, not once a frame.

### Added

- `test/ai.test.ts`: 12 tests over what the host actually does — concentrating fire, coming round a flank, keeping archers off the swords, charging with the horse, leaving a tortoise alone, declining a losing trade, holding for support, and committing anyway once the battle is half gone. Two of them exist to catch the failure modes the design invites: that the host never closes, and that it stalls out the clock.

### Changed — an objective is a comparison against a metric

`Objective` carried a `kind` from a closed union and two files switched over it: the sidebar's live readout in `client/src/engine/objectives.ts`, and the scoring in `server/progress.ts`. Nine cases, written twice, in different packages, with nothing that would fail if the two ever disagreed about what "met" meant. Both switches are gone. See `docs/adr/0003-objectives-are-metric-comparisons.md`.

- A battle now publishes a `MetricBag` — every number it measures, by name. `metrics()` in `client/src/engine/battle.ts` builds it, and the same bag answers the live panel mid-battle and the server's scoring at the end, so the two cannot drift.
- `Objective` is `{ id, text, metric, compare, value?, points, hint, outstanding? }`, with `compare` one of `victory`, `gte`, `lt`, `zero`. `shared/objectives.ts` is the only judge, imported by both packages.
- The after-action hint moved out of a branch in the client and into the scenario data, beside the objective text it explains. `shared/data/scenarios.ts` builds its objectives from named helpers, so the hint for a lesson several battles teach is written once.
- **Saves are untouched.** Objective ids are the old `kind` strings exactly, and `objectivesMet` already held those strings, so every objective a player had earned is still earned.
- `BattleStats` is `{ won, metrics }` rather than thirteen named fields. It arrives over HTTP, so `sanitizeStats` now fills it out and cleans it the way `sanitizeSave` already treats the save file: whole, non-negative, and nothing the game does not measure.
- The pila objective used to go green once every cohort had thrown, counting cohorts that had already died. It counts standing cohorts that have yet to throw, and its readout says how many are left rather than how many have gone.

### Added

- `test/objective-metrics.test.ts`: 10 tests over the comparator, the shape of every shipped objective, and a posted battle report full of things a battle could not have produced. 105 pass.

### Changed — the Baroque skin

The battle screen was redesigned, and the same stylesheet carries the menu, codex and modals so nothing is left unstyled. Light parchment out, midnight ground in: deep crimson for Rome, royal gold for rules and labels, royal purple for Dacia, emerald for an objective met. Type is Cinzel Decorative for display, Cinzel for body, JetBrains Mono for every number. Implemented from `docs/design_handoff_baroque_battle_screen/`, which is committed alongside as the reference.

- `client/src/styles.css` replaced wholesale. No class was dropped: every selector the previous sheet styled is styled here too, and the design already targeted the post-refactor `.player` / `.enemy` side classes.
- The canvas cannot read CSS, so `client/src/render.ts` carries the board palette separately: terrain fills, unit counters (crimson with a gold rim for Rome, royal purple with lavender for Dacia), the gold reach overlay with a rim so it reads on the dark ground, threat hatching, floating damage numbers and the strength bars.
- The battle HUD was re-ordered as the design specifies. The left panel is now the acting panel: unit card, then formation, then strike mode, then the forecast, then end turn. Objectives, the threat readout and the dispatch log moved to the right column, which was previously the log alone.
- New fonts in `client/index.html`. No new dependencies and no build changes.

**Accessibility.** Every foreground/background pair in the palette was checked against WCAG AA. All text pairs pass: muted body text is 9.66:1 on panels, gold labels 8.40:1, ivory on the primary button 7.50:1, the objective checkmark 7.45:1 on its emerald chip. Two pairs look marginal measured naively and are not: the active formation button reads 4.17:1 against the very bottom of its gradient but 6.04:1 where the text actually sits, and emerald measures 2.50:1 against a panel but is only ever a border or a chip fill, never text, and "met" is carried by the checkmark and the row text as well as by colour.

### Performance

Hovering the board re-ran the pathfinder twice and repainted the ground from scratch. Measured with `npm run bench` on the worst board the game ships (Sarmizegetusa, 14x10, 19 units), median of 5 runs, same machine before and after:

| | before | after | |
|---|---|---|---|
| `reachable`, one unit | 35.3 us | 6.1 us | 5.8x |
| `pathTo`, one hover | 47.2 us | 6.2 us | 7.6x |
| `threatMap`, after every order | 877.8 us | 177.4 us | 4.9x |
| hover cost (both walks) | 93.3 us | 19.9 us | 4.7x |

- The pathfinder walks the board on integer indices instead of `"q,r"` strings. `neighbors()` allocated an array and ran two cube conversions per call, and `terrainAt()` built a string key per lookup; both were being called for every neighbour of every hex walked. Neighbour lists are now computed once per board size and terrain once per scenario, both cached. The frontier is bucketed by cost rather than re-sorted, which is exact here because terrain costs only 1 or 2. Occupancy is indexed once per walk instead of scanned per neighbour.
- `reachable` and `pathTo` were each a full walk of the board, and hovering a reachable hex ran both. `movement()` now returns the walk and `pathFrom()` reads a route out of it, so a hover pays for one.
- The threat overlay swept outward from each firing position instead of testing all 140 hexes against every position. For a missile unit that was 140 hexes x ~30 positions of cube-distance arithmetic, on every order.
- **Terrain is drawn once per battle, not once per frame.** It was being rebuilt on every mouse move: a radial gradient constructed per hex, a hex path stroked, and a procedural scatter of trees, hill contours or boulders painted on top. It is now rendered into an offscreen canvas and blitted, keyed on scenario and device pixel ratio so a monitor change repaints rather than stretching a stale bitmap. What remains of the per-hex pass skips any hex with no threat, no move and no cursor on it.

Not changed: `fromPixel` measures 0.6 us and was never the bottleneck it was assumed to be, so the hex picker was left alone rather than rewritten for no gain.

### Added

- `npm run bench` (`scripts/bench.ts`): timings for the hot paths behind a mouse move, reported as a median of 5 samples with the range, because a single pass swings by a third on a busy machine.
- `?perf=1` on the battle screen shows median and p95 for the board repaint and the threat map under the board. Drawing cost can only be measured in the browser doing the drawing.
- `test/perf-parity.test.ts`: the pre-speedup `fromPixel` and Dijkstra kept as reference oracles, plus checks that every path is walkable and ends where asked, that the overlay never marks a hex twice for one unit or marks one off the board, and that a shaded missile hex is one a shooter could actually stand and reach. A faster version is only allowed to be faster.

### Changed

- **The engine no longer knows who is fighting.** `Side` is `"player" | "enemy"`; a campaign record (`shared/data/campaigns.ts`) supplies the words on screen, so the log still reads "The Dacians move." while `rules.ts` contains neither name. Ten files named one or both peoples before this. See `docs/adr/0002-campaign-registry-and-generic-sides.md`.
- `UnitKind` is derived from the roster files rather than written out by hand. Rosters split into `shared/data/units-rome.ts` and `shared/data/units-dacia.ts`; `shared/data/units.ts` assembles them and the type follows the data.
- Formations are data (`shared/data/formations.ts`). `attackMul`, `defenseMul`, `missileMul`, `moveOverride`, `ignoresFlanking` and `blocksPila` were literals inside branches in `rules.ts`; combat now reads the table.
- Unit behaviour the rules used to match on kind is now a trait on the template: `core`, `mounted`, `chargeBonus`, `armourPiercing`, `missileVerb`, `glyph`. Cataphracts charge harder because of a number on their template, not because `rules.ts` knows their name. The renderer's hardcoded glyph map is gone with it.
- `Scenario.rome` / `.dacia` are `Scenario.player` / `.enemy`, and each scenario carries a `campaignId`. `BattleStats.romanLosses` / `.dacianLosses` are `playerLosses` / `enemyLosses`.
- `/api/state` returns the campaign list; the menu hero reads its title, subtitle and blurb from the campaign instead of having the Dacian Wars typed into it.

Behaviour is unchanged. All 74 existing tests pass with no expectation altered: the only test edits are renames plus one added fixture field.

### Added

- `test/campaign.test.ts`: 11 tests over the seams a second era will lean on. Every scenario points at a real campaign, every placement names a unit that exists and puts it on the side the scenario expects, every unit has a board glyph, every formation offered in the orders panel is defined, and each of the six scenarios plays through to a decision.

- Enemy reach overlay (`client/src/engine/threat.ts`). Every hex a Dacian unit could strike on its next turn is shaded on the board: red hatching where a charge can arrive, purple dots where their archers reach. It reports capability, not the AI's intent, so a player who plans against it is never ambushed by the AI changing its mind. Toggle with `T` or the button under the board.
- Board bar under the map: the overlay switch, a running count of threatened hexes, and a key to every colour the board uses.
- Danger readout in the unit panel. Hovering any hex names who bears on it — "Charged by 2 Dacian Warbands, Falxmen" — and falls back to the selected unit's own hex so the panel answers "am I exposed where I stand?" with nothing hovered.
- `projectedReach` in `client/src/engine/rules.ts`: where a unit could stand on a fresh turn, whatever it has already spent this one. The threat map is built on it.
- Six tests over the threat map, including the one that matters most: standing a cohort in a corridor shrinks the enemy's reach the moment it moves.

## [0.2.0] - 2026-09-04

### Added

- Undo. Takes back moves, attacks and formation changes inside your own turn, by keyboard (`U`, `Ctrl+Z`) or button. Ending the turn clears the stack, so the Dacian dice cannot be re-rolled.
- Keyboard orders for the whole battle screen (`client/src/ui/keys.ts`): end turn, cycle to the next cohort with orders left, set formation, switch between gladius and pila, deselect, reopen the briefing.
- Combat forecast (`client/src/engine/forecast.ts`). Hovering a reachable target shows the men each side stands to lose, whether the blow breaks the target, and whether the counter-attack could break the attacker.
- Live objective tracking (`client/src/engine/objectives.ts`). The objective list marks itself done, failed or pending as the battle runs, with a running count.
- After-action review. Every missed objective in the result modal now carries a line on what would have met it.
- Movement path preview. Hovering a reachable hex draws the route the unit would walk.
- Floating damage numbers, driven by an optional `BattleState.listener` so the rules stay free of any reference to a canvas.
- Restart button, to redeploy the opening position without recording a defeat.
- Test suite: 68 tests over hex geometry, movement, formations, flanking, combat, turn structure, the forecast, live objectives, progression scoring and the save file. Run with `npm test` or `npm run check`.

### Changed

- `client/src/engine/rules.ts` splits the damage formulas from the dice. `attackPower` and `damageToMen` are pure, so the forecast shares one formula with the real blow and tests can pin the roll with `setRoll`.
- `reachable` and the new `pathTo` share one Dijkstra pass instead of two.
- Hovering the board no longer rebuilds the whole sidebar and dispatch log. Only the board and the unit card redraw.
- A Roman unit that has moved is now shaded lighter than one that has attacked, so units still owed orders are easy to find.
- `SaveStore` writes to a temp file and renames into place, so a crash mid-write leaves the previous campaign intact.
- `sanitizeSave` drops unknown scenarios and codex ids, clamps hand-edited numbers, and recomputes rank from points rather than trusting the file.

### Fixed

- Battle screen key bindings are removed when the screen is torn down, instead of leaking across navigation.

## [0.1.0] - 2026-09-04

### Added

- First release. Six battles across the Dacian Wars, hex tactics, four legionary formations, the Codex, and local campaign persistence.
