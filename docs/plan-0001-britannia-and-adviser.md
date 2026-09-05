# Plan 0001 — Britannia campaign, the Praefectus adviser, and the render speedups

<!-- aquila-legions | drafted 2026-09-05 | against M3n0ko0g-library rules/{engineering-standards,modularity,guardrails,production-dod}.md and commands/plan.md -->
<!-- Repo state measured on Windows, in the real checkout: F:\classHuman\aquila-legions, branch claude/plan-britannia-adviser, clean tree at 48876f8. -->

Three workstreams came out of the test notes. They're sequenced, not simultaneous.

- **C. Speedups** — small, self-contained, no new surface. Lands first because it makes B and A cheaper to build.
- **B. Praefectus adviser + Commentarii** — the "AI somewhere" and "stash of knowledge" ask.
- **A. Britannia campaign** — the second era. Biggest, and it needs a refactor before a single scenario can exist.

---

## 0. Classify

- **C (speedups): production.** Full DoD. It touches shipping code paths.
- **B (adviser): production, with one spike inside it.** The local rule-based coach is production. The Claude API counsel route is a **spike** until you've seen what it costs and whether the writing is any good; it stays behind an env flag and never becomes required to play.
- **A (Britannia): production.** Full DoD.

---

## 1. Discovery

Searched `client/src/`, `shared/`, `server/`, `test/`. 4,026 lines across 34 files. Every file is under 400 lines, so modularity rule 2 already holds. What matters:

### The side coupling

`Side = "rome" | "dacia"` (`shared/types.ts:3`) is baked into behaviour, not just labels:

| File | What's hardcoded |
|---|---|
| `shared/types.ts` | `Side`, `UnitKind` (10-value closed union), `Formation` (4 Roman), `ObjectiveKind` (9), `Scenario.rome` / `.dacia`, `BattleStats.romanLosses` / `.dacianLosses` |
| `client/src/engine/battle.ts:99-142` | `place("rome", ...)`, `place("dacia", ...)`, `active: "rome"`, trackers named for both sides |
| `client/src/engine/rules.ts` | `rangedTargets` flips `"rome"`/`"dacia"` by hand; `applyDamage` picks a tracker by side; `checkRout` credits kills only when `victim.side === "dacia"`; `checkOver` and `endTurn` name both sides |
| `client/src/engine/ai.ts` | `nearestRoman()`, `unitsOf(s, "rome")`, `dacianTurn()` |
| `client/src/engine/objectives.ts` | one `switch` over all 9 objective kinds |
| `server/progress.ts:12-24` | a **second** `switch` over the same 9 kinds |
| `client/src/ui/battleScreen.ts` | `target.side === "rome"`, `threatMap(s, "dacia")`, `s.active !== "rome"` |

The player is Rome in both campaigns, so `"rome"` survives. Only `"dacia"` has to go. That keeps this to a rename plus four extractions, not a faction-agnostic rewrite.

### The duplicated objective switch

`objectives.ts` and `progress.ts` both switch on `ObjectiveKind`. Adding a Britannia objective means editing both, in two packages, with no compiler link between them. That's the DRY break worth fixing before the campaign, not after.

### Speedup candidates, each measured against the code

| # | Where | What happens now |
|---|---|---|
| C1 | `render.ts:287` | `createRadialGradient` runs once per hex per frame. 140 gradients built on every mouse move, because `drawHover` calls `drawBoard` calls `render`. Terrain never changes during a battle. |
| C2 | `hex.ts:55` | `fromPixel` scans all 140 hex centres and keeps the nearest. Runs on every `mousemove`. |
| C3 | `battle.ts:89` | `unitAt` is `s.units.find(...)`, a linear scan, called from the Dijkstra inner loop in `rules.ts:65` for every neighbour of every popped hex. |
| C4 | `rules.ts:59` | `frontier.sort()` inside the `while`, so the whole frontier is re-sorted on every pop. Move costs are only 1 or 2. |
| C5 | `battleScreen.ts:115,124` | `highlights()` calls `reachable()` (full Dijkstra), then `pathTo()` (another full Dijkstra over the same board). Both on every mouse move. |
| C6 | `threat.ts:59` | For each missile unit: `width × height` hexes, and for each one a `spots.some(...)` over ~30 reachable positions, each doing a cube conversion. About 4,200 distance calls per archer. `refreshThreat()` runs after every order. |
| C7 | `render.ts:58` | `drawTerrainDetail` does `ctx.save()`, tests for forest, does nothing, `ctx.restore()`. Dead code called 140 times a frame. |

Sarmizegetusa is the worst case: 19 units, 2 enemy archers, 140 hexes.

### Minimum scope

- **C**: `render.ts`, `hex.ts`, `battle.ts`, `rules.ts`, `threat.ts`, `battleScreen.ts`. Six files, all in one layer. No new files.
- **B**: new `client/src/advisor/`, new `server/counsel.ts`, plus `shared/types.ts` (save v2) and `server/progress.ts` (migration).
- **A**: the refactor first (rule 4: refactor before the feature), then Britannia is nearly all new files under `shared/data/campaigns/`.

---

## 2. Modularity check

- [x] Single responsibility per file. The new `advisor/` splits into `rules.ts` (what to notice), `tips.ts` (the text), `triggers.ts` (knowledge unlocks).
- [x] No ripple into unrelated directories. C stays in the engine and render layer. B adds directories rather than widening existing files.
- [ ] **A fails this as written.** The side refactor touches 10 files, past the 3-4 threshold in `/plan` §1. That's why A is split into A0 (refactor, own branch, no behaviour change, existing tests must pass untouched) and A1 (the campaign). A0 is the refactor the rule asks for.

---

## 3. Design

### A. The next campaign: Watling Street, 61 AD

Picked at random from 16 legendary Roman battles, rolled with `crypto.getRandomValues`: index 8 of 16, the Boudican Revolt. I'm keeping the roll.

It's a better draw than it looks. The Dacian campaign teaches offensive tools: pila, wedge, tortoise, circle. Watling Street is won before contact, by where Suetonius Paulinus chose to stand. Tacitus (*Annals* XIV.34) has him take a defile with woods at his back and open ground in front, so 10,000 men couldn't be flanked and a host many times that size couldn't bring its numbers to bear. The British families watching from their wagon line behind the army became the wall their own men couldn't retreat through.

So the second campaign teaches **ground, frontage, and morale**, which the engine currently models not at all.

#### Six scenarios

| # | Title | Year | Teaches | New machinery |
|---|---|---|---|---|
| 1 | The Temple of Claudius | 60 AD | Delay is a win condition | Hold-hex objectives, survive-N-turns victory |
| 2 | The Ninth on the Road | 60 AD | A column is not a line | March formation, ambush reveal, map-edge extraction |
| 3 | Londinium Given Up | 61 AD | Escort under pressure | Friendly non-combatants, protect-and-move |
| 4 | Choosing the Ground | 61 AD | Frontage and flank security | **Player deployment phase**, impassable terrain |
| 5 | Watling Street | 61 AD | Everything, at 10-to-1 odds | Rout cascade, the wagon line as an obstacle |
| 6 | The Winter Sweep | 61/62 AD | When to stop | Restraint objective (a cap you must stay under) |

Scenario 6 is Paulinus's punitive campaign, the one that got him recalled after Classicianus complained to Nero. An objective you win by *not* doing something is a shape this game hasn't used yet.

#### New content

- **Units**: `britons_warhost` (huge, cheap, poor), `essedarii` (chariots, hit and withdraw), `iceni_nobles` (elite), `britons_slingers`, `colonia_veterans` (weak Roman, scenario 1), `wagon_line` (static obstacle).
- **Terrain**: `marsh` (very slow), `cliff` (impassable), `road` (fast). Impassable needs `moveCost` to grow a blocked case, which it currently can't express.
- **Formation**: `march_column` (fast on road, terrible defense) for scenario 2.
- **Codex**: Boudica, the Iceni and the Trinovantes, the destruction of Legio IX Hispana's column, Poenius Postumus of Legio II Augusta falling on his sword after refusing the march, Tacitus's casualty figures against the archaeological burn layers at Colchester, London and St Albans.

#### The refactor it needs (A0)

Four moves, no behaviour change:

1. **`Side` becomes `"rome" | "foe"`.** Trackers become `playerLosses` / `enemyLosses`. `dacianTurn` becomes `enemyTurn`, `nearestRoman` becomes `nearestPlayerUnit`. `Scenario.rome` / `.dacia` become `.player` / `.enemy`. Display names move to the campaign record.
2. **Unit rosters become per-campaign modules**, with the union derived rather than hand-written:
   ```ts
   export const DACIA_UNITS = { ... } as const satisfies Record<string, UnitTemplate>;
   export const ALL_UNITS = { ...DACIA_UNITS, ...BRITANNIA_UNITS };
   export type UnitKind = keyof typeof ALL_UNITS;
   ```
   Strict typing holds and a new campaign adds a file rather than editing a union.
3. **Formations become data.** `FormationDef { attackMul, defenseMul, missileMul, moveOverride, ignoresFlanking }`. The multipliers currently sitting as literals in `rules.ts:180-196` move into `shared/data/formations.ts`. This shrinks the rules file and is what lets `march_column` exist without touching combat code.
4. **Objectives become metric comparisons.** `Objective { metric: string, compare: "gte" | "lt" | "eq0" | "flag", value?: number }` reading a `Record<string, number>` tracker bag. Both `switch` blocks collapse into one comparator plus a table of hint strings. New objectives stop requiring engine edits.

Alternative considered: leave `Side` alone and add `"britannia"` to the union. Cheaper today, and it makes campaign three cost the same again, with `rangedTargets` growing a lookup table of who fights whom. Rejected.

### B. The Praefectus: adviser and Commentarii

Three layers. Each works on its own, and each is useful if the one above it never gets built.

**B1. The local coach (no key, no network, ships first).**

A `client/src/advisor/` module that reads `BattleState` and returns ranked tips. Everything it needs already exists and is already pure: `threatMap` knows who bears on a hex, `forecast` knows what a blow will do and whether the counter-attack breaks you, `objectiveProgress` knows which lesson you're currently failing.

Tips it can give honestly, today:

- "Coh. IV is in bow range, in line. Testudo cuts that by three quarters." (threat + formation)
- "This charge kills them on any roll. The counter-attack could break you." (forecast, `risky`)
- "Coh. II still has its pila and you're about to swing. That fails the objective for the whole battle." (`pilaViolated` before it fires)
- "Two units already touch that warband. A third makes it flanked." (`isFlanked`)

Deterministic, unit-testable, free, and it's most of the value.

**B2. Claude counsel (opt-in, spike).**

`POST /api/counsel` on the existing Express server. Takes a compact snapshot (turn number, each unit as kind + strength percent + formation + position, objective statuses, last 5 log lines — under 1 KB), returns two sentences in the voice of a camp prefect.

- SDK: `@anthropic-ai/sdk`, `new Anthropic()` (resolves `ANTHROPIC_API_KEY` from env). **You set the key. I never touch it, open it, or read it.**
- Model: `claude-opus-5` at `output_config: { effort: "low" }`, $5/$25 per MTok. A tip is roughly 700 in / 60 out, so about $0.005 a call. If you'd rather trade quality for cost, `claude-haiku-4-5` is $1/$5 (about $0.0010 a call) and `claude-sonnet-5` is $2/$10. Your call, and it's one constant.
- Non-streaming, `max_tokens: 300`, client `timeout: 6000` (the TypeScript SDK takes milliseconds), `maxRetries: 0`. One call per turn, fired by a button, never automatically.
- No key present: the route returns 501 and the UI never shows the button. The local coach carries on.

This is the piece that makes the game stop being purely local, which is a real change to what the README promises. It gets an ADR.

**B3. The Commentarii (the stash).**

The player's notebook, persisted in `save.json`. Three things file into it:

1. Codex entries, on unlock (already happens, just nowhere to keep them together).
2. **Knowledge triggers** — the "alerts you of new knowledge as you progress" piece. A data table in `shared/data/triggers.ts` maps a condition to a one-line historical note: first testudo formed under live fire, first wedge that broke a unit, first flank kill, first cohort lost. A toast fires, the note files itself. No model call, no cost, and it's exactly what you described.
3. Pinned adviser tips, local or Claude-written.

Searchable by tag, exportable to markdown, and per the library rule that anything worth keeping is a file in a repo, the export is a real file, not a screen.

Save goes to `version: 2`. `sanitizeSave` currently hard-rejects anything that isn't `version: 1` (`progress.ts:74`), so the migration has to be explicit: read v1, add an empty `commentarii`, write v2.

### C. Speedups

C1 is the big one: pre-render terrain to an offscreen canvas once per battle, then blit it. That deletes 140 gradient constructions and 140 hex paths per frame. C7 deletes dead code. C2 replaces the 140-hex scan with the pixel-to-axial inverse plus cube rounding, O(1). C3 adds an occupancy `Map` rebuilt per search. C4 swaps the re-sorting frontier for a 2-bucket queue, which is exact because costs are only 1 and 2. C5 runs `search()` once and hands the result to both `reachable` and `pathTo`. C6 walks outward from each firing position to range instead of scanning the board.

---

## 4. Risks and tests

### C — speedups

| Edge case | Handling |
|---|---|
| `fromPixel` returns a different hex near a hex border after the rewrite | Property test: for all 140 hexes, `fromPixel(toPixel(h))` round-trips. Plus 500 random points cross-checked against the current brute-force scan. |
| Bucket queue diverges from Dijkstra when a cheaper path is found late | Test `reachable` and `pathTo` against the current implementation across all 6 scenarios and every unit. Costs must match exactly. |
| Cached terrain canvas survives a `devicePixelRatio` change (monitor drag) | Cache keyed on scenario id **and** dpr; rebuild on mismatch. |
| Occupancy map goes stale after `moveUnit` or a rout | Map is built inside `search()`, never stored on state. Nothing to invalidate. |

Test files: `test/hex.test.ts` (extend), `test/rules.test.ts` (extend), new `test/perf-parity.test.ts` holding the old implementations as reference oracles.

**External calls: none.** C is pure computation. Gate 2 is N/A for C.

### B — adviser

| Edge case | Handling |
|---|---|
| No `ANTHROPIC_API_KEY` | Route returns 501, client hides the button, local coach unaffected. Tested with the env var unset. |
| API times out, rate-limits, or refuses | 6s timeout, no retry, caught by typed class (`Anthropic.RateLimitError`, `Anthropic.APIError`). Player sees "No word from the Praefectus" and the local tip instead. Never blocks a turn. |
| A v1 save meets a v2 build | Explicit migration. Reverse is safe: v2 read by a v1 build hits the `version !== 1` guard and resets, so **the migration writes a `save.json.v1.bak` before its first write.** |
| Local coach fires on a finished battle or an empty board | `over` and empty-unit guards, tested. |
| Claude's reply contains markup or runs long | Rendered as plain text, truncated at 400 characters. Never `innerHTML`. |

Test files: new `test/advisor.test.ts` (local coach, deterministic), new `test/counsel.test.ts` (route with the key absent, and with a stubbed client for timeout and error paths — no test ever calls the real API), `test/progress.test.ts` (extend for the v1→v2 migration).

**Failure behavior for the one external call:** `POST /v1/messages`, 6s timeout, zero retries, failure mode is a visible fallback to the local tip. Logged server-side with turn and scenario id, never with the request body.

### A — Britannia

| Edge case | Handling |
|---|---|
| A save holds Dacian scenario records after `Side` is renamed | Scenario ids don't change. `sanitizeSave` drops unknown ids already. Tested with a real pre-refactor `save.json`. |
| Deployment phase lets a unit be placed on impassable terrain or off-zone | Placement validated against the zone and the blocked set, server-side too, since the result post is the trust boundary. |
| Rout cascade chains without end | Each unit checks at most once per turn, tracked by a set. Test a 10-unit line where the end unit breaks. |
| Campaign 2 unlocked before campaign 1 finishes | `isUnlocked` grows a campaign predecessor, mirroring the existing `order - 1` rule. |
| A0 changes behaviour by accident | **A0's gate: the existing test suite passes with zero edits to test assertions.** Only imports and type names may change in test files. If an assertion needs changing, A0 broke something. |

Test files: all 7 existing suites, plus new `test/campaign.test.ts` (registry, unlock chains), `test/deployment.test.ts`, `test/morale.test.ts`.

---

## 5. Implementation checklist

### C — speedups (own branch, lands first)

1. Delete `drawTerrainDetail` and its call site. Run `npm run check`.
2. Add `test/perf-parity.test.ts` with the current `fromPixel` and `search` copied in as reference oracles. Green against today's code.
3. Rewrite `fromPixel` as pixel-to-axial + cube rounding. Parity test must stay green.
4. Add the occupancy `Map` inside `search()`. Parity test green.
5. Replace `frontier.sort()` with the 2-bucket queue. Parity test green.
6. Have `highlights()` call `search()` once and share it with `reachable` and `pathTo`.
7. Pre-render terrain to an offscreen canvas, keyed on scenario id + dpr; blit it in `render()`.
8. Rewrite `threat.ts` missile marking to walk outward from each firing position, deduped.
9. Add the `?perf=1` timing overlay: `performance.now()` around `render()` and around `threatMap`, printed as a rolling p95.
10. `npm run check`. Record the before and after numbers in `CHANGELOG.md`.

### B — adviser

1. `client/src/advisor/rules.ts` + `tips.ts`, pure, with `test/advisor.test.ts`.
2. Wire the tip panel into the battle sidebar. Keyboard reachable, labelled.
3. `shared/data/triggers.ts` + the toast, with the Commentarii write.
4. Save v2: type, migration, `.bak`, `test/progress.test.ts` extension.
5. Commentarii screen: list, tag filter, markdown export.
6. **Stop here and show it.** B1 to B5 is a complete, useful feature with no API key and no cost.
7. Only then: `server/counsel.ts`, the 501-when-no-key path, the button, `test/counsel.test.ts`.
8. ADR `docs/adr/0002-claude-counsel-makes-the-game-non-local.md`.
9. `npm run check`.

### A — Britannia

1. **A0, own branch.** The four refactor moves, in order: `Side` rename, per-campaign rosters, formations to data, objectives to metrics. Existing tests pass with no assertion edits.
2. ADR `docs/adr/0003-campaign-registry-and-generic-sides.md`.
3. Terrain gains `blocked`; add `marsh`, `cliff`, `road`.
4. Britannia roster + `march_column`.
5. Deployment phase (engine, then UI).
6. Rout cascade + the restraint objective comparator.
7. The six scenarios, one at a time, each playable before the next starts.
8. Codex entries and the campaign-select screen.
9. `npm run check`.

Every workstream's last step is `npm run check` (`tsc --noEmit` on both projects, then `node --test`).

---

## 6. Production DoD plan

| # | Gate | C — speedups | B — adviser | A — Britannia |
|---|---|---|---|---|
| 1 | Correctness | `test/perf-parity.test.ts` against reference oracles; extended `hex` and `rules` suites | `advisor.test.ts`, `counsel.test.ts`, migration tests | A0 gate: existing suite unedited; new `campaign` / `deployment` / `morale` suites |
| 2 | Failure behavior | **N/A — no external calls.** Pure computation | One call: 6s timeout, 0 retries, falls back to the local tip | **N/A** — client-side engine; the existing result POST is unchanged |
| 3 | Observability | `?perf=1` overlay reporting render and threat p95 | Server logs counsel failures with turn + scenario id, never the body | Battle log already records every order; deployment and cascade get log lines |
| 4 | Security | No new surface | **The key is yours to place. Never sent to the client, never logged, never in a diff.** Claude's reply is rendered as text, never `innerHTML`. Deployment validated server-side. One new dependency: `@anthropic-ai/sdk`, official, flagged here per the standing rule | No new surface |
| 5 | Data | No save change | v1→v2 migration, `save.json.v1.bak` written before the first v2 write, restore is a file copy | No save change; scenario ids stable |
| 6 | Accessibility | Unchanged | Tip panel and Commentarii: keyboard reachable, visible focus, AA contrast, every control labelled | Deployment phase must be fully keyboard-driven, not drag-only |
| 7 | Performance | **Board redraw p95 under 4 ms and hover-to-repaint under 8 ms at 14×10 on this machine**, measured by the `?perf=1` overlay. Baseline recorded first | Local tip under 1 ms. Counsel is off the turn loop | Deployment and cascade inside the same 4 ms budget |
| 8 | Documentation | CHANGELOG with before/after numbers | README gains a "Claude counsel is opt-in and costs money" section; ADR 0002 | README campaign section; ADR 0003 |
| 9 | Deploy + rollback | Local `npm run dev`; rollback is a branch revert | Same, plus: unset the env var and the feature is gone | Same |
| 10 | Human gate | You see the diff before every commit | Same | Same, and A0 gets its own review before A1 starts |

---

## 7. Model and context

- **Task:** C is mechanical with an exact correctness oracle. B is ordinary feature work. A0 is a cross-cutting refactor.
- **Model:** Opus 5 for A0 (a rename that has to be exactly right across 10 files) and for the C4/C6 algorithm rewrites. Sonnet 5 is enough for B's UI work and the scenario data.
- **Sub-agent:** Yes, one, for C step 2: have it copy the current `fromPixel` and `search` into the parity test and confirm green. Haiku 4.5 — mechanical, and it returns only pass or fail.
- **Context load:** C light. B moderate. A0 heavy, because the rename has to hold all 10 files at once.
- **Checkpoint:** after each workstream ships. A0 and A1 are separate sessions.
- **Token saving:** the six Britannia scenarios are data. Write them one file at a time without the engine in context.

---

## Self-evaluation

| Axis | Score | Note |
|---|---|---|
| Contextual fit | 5 | Every claim is cited to a file and line in this checkout. |
| SOLID | 4 | A0 fixes the two real breaks (duplicated objective switch, combat multipliers as literals in the rules file). |
| Error handling | 5 | Was 3. The first draft had the counsel route with a timeout and no answer for a v2 save meeting a v1 build. Added the `.bak` before first v2 write and the explicit "player never blocked" fallback. |
| Modularity | 4 | A only passes because A0 is split out. As one branch it would fail rule 4. |

---

## The open question

C, B, and A are independent. C is cheapest and makes the rest easier. B is what you actually asked for in the test notes. A is the biggest and needs A0 first.

**Which one do you want built?**

---
LAHA — Love All Humans Always.
