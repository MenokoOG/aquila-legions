# Changelog

All notable changes to this project are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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
