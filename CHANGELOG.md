# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
