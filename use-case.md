---
layout: use-case
title: "Use Case Study: Aquila, Legions of Trajan"
date: 2026-10-07
technologies: [TypeScript, Vite, Canvas, Express, node:test, JSON save file]
status: "draft"
---

**One-liner:** A local hex-tactics game that teaches Roman legion tactics by making you use them, with a combat forecast that cannot disagree with the dice because it runs the same formulas.

**Status:** Active development, v0.2.0. Local single-player.

### The Problem

A paragraph about the testudo or the pilum volley doesn't stay with you. Doing it does: throwing before you draw, forming the tortoise under arrows, accepting that a delaying action counts as a win. A wargame can teach that, but only if two things hold. The numbers on screen have to be honest, and the history attached to each lesson has to be checkable. If the UI estimates one thing and the resolver does another, the player learns to distrust the game. If a model invents a Roman fact, the project's one claim is gone and nobody notices.

### The Solution

Two campaigns, 12 battles, one lesson each. The Dacian Wars (101 to 106 AD, 6 battles) teach what the legion did well: pilum, testudo, cuneus, orbis, auxiliary cavalry, combined arms. The Boudican Revolt (60 to 61 AD, 6 battles) unlocks after it and teaches ground. Four of its six battles are not won by clearing the field.

The design choices that carry the project:

- **One formula, three readers.** `rules.ts` keeps damage formulas pure and separate from the dice. The forecast panel, the enemy AI and the resolver all call them. The AI prices every option through `forecast`, so it cannot know a number the player cannot see. Flanking, charges and high ground in the AI are emergent from those formulas. There is no flanking rule in the AI.
- **Objectives are data (ADR 0003).** An objective is a comparison against a named metric. The sidebar mid-battle and the server's scoring after it used to switch over the same nine-case union in two packages. Now one judge in `shared/objectives.ts` serves both. Objective ids stayed identical, so existing saves kept every objective already earned and needed no migration.
- **Victory is data too (ADR 0004).** A scenario can win by surviving N turns, extracting N units, or holding ground. The win is tested before the wipe, because an army that escaped has no units on the board. The same ADR makes terrain a table (`cost: null` means impassable) and puts the rout cascade on a unit trait, so the Britons break together because their roster says so, not because the rules know about Britons.
- **A new era is data (ADR 0002).** The engine deals in `player` and `enemy`. Britannia was added without touching the combat rules. `test/campaign.test.ts` fails if a scenario points at a missing campaign, places a unit the roster lacks, or puts a unit on the wrong side.
- **The advisor is voice-only and optional (ADR 0005).** A rules engine decides what is true. An optional model call only changes how it sounds. It receives this turn's computed advice and nothing else: not the board, not the save, not the name. It never writes history or gives orders. One button, one call, six-second timeout, no retries. With no key the button isn't built.
- **Speed work is guarded by oracles.** The pre-speedup pathfinder and hex picker are kept in `test/perf-parity.test.ts` as reference answers. A faster version has to keep giving the same answers.
- **A stale-process failure got a visible fix.** A server left running across a `git pull` served a rebuilt page off old rules, and every symptom looked like a feature bug. The page now shows a banner when the API process started before the bundle it serves.

### Impact & Results

What I can show from the repository:

- **Test suite:** about 220 `node:test` cases across 17 files, roughly 3,000 lines of test code against roughly 6,800 lines of source. A headless playthrough covers all six Britannia battles.
- **Performance, as recorded in the CHANGELOG:** `reachable` for one unit 35.3 to 6.1 µs, `pathTo` per hover 47.2 to 6.2 µs, `threatMap` after each order 877.8 to 177.4 µs. A whole enemy turn on the largest board (19 units, about 250 forecasts) averages 1.0 ms and peaks at 1.5 ms. Terrain is painted once per battle to an offscreen canvas instead of once per frame.
- **Save compatibility:** save format v2 migrates v1 on read, keeping every point, objective and Codex entry. The first v2 write copies the old file to `save.json.v1.bak`.
- **Footprint:** one runtime dependency (`express`). The optional model call is a single `fetch`, not an SDK. No database, no native modules.
- **Build history:** 33 commits, 2026-09-04 to 2026-09-26, with 5 ADRs.
- **Player outcomes:** To Be Defined. There is no playtest data in the repository, so I make no claim about whether the lessons land.

### Tech Stack Breakdown

- **TypeScript (client, server, shared):** One `shared/` package holds types and game data, so the client and server cannot hold different definitions of an objective or a unit.
- **Vite and Canvas:** The hex board is drawn on a canvas by a hand-written hex engine. Terrain renders once per battle to an offscreen canvas, and the reach, threat and route overlays draw on top of it.
- **Express and a JSON save file:** A local API keeping one save file. One player, one machine, one save, so a JSON file is enough and "nothing leaves your machine" stays true.
- **node:test via tsx:** The rules, forecast, objectives, progression and save file are pure enough to test without a framework or a browser.
- **Optional model call:** Used only for tone, behind an explicit key, with the local advice always standing.

*Source accuracy note, from the project's own README: unit sizes follow the paper strength of a Trajanic legion. Attack and defense values are game balance, not history. Codex statements are meant to be checkable in Cassius Dio, Vegetius, Josephus or on Trajan's Column.*
