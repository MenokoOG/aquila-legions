# 5. The Praefectus may borrow a voice, never a fact

Date: 2026-09-06

## Status

Accepted.

## Context

The README's first paragraph said "Nothing leaves your machine." That is no longer true, and this is the change that made it untrue, so it needs writing down.

The local adviser shipped first and works: it reads `threatMap`, `forecast` and `objectiveProgress` and produces short true sentences about the board. It is correct, free, instant and testable, and it reads like a rules engine — because it is one. The ask was for a camp prefect, and a camp prefect has a voice.

The question was not whether a model could write better prose. It obviously can. The question was what it is allowed to know.

## Decision

**Facts in, prose out.** `client/src/advisor/tips.ts` decides what is true. `server/counsel.ts` sends those already-true sentences to the model and asks for the one or two that matter most, in the prefect's voice. The model chooses emphasis and phrasing. It is instructed that it may assert nothing it was not handed, and structurally it has nothing else to work from: it never sees the board, the rules, the save, or the player.

Three things it is therefore not allowed to do, and the reason for each:

**No generated history.** Every Codex statement in this game is meant to be checkable in Tacitus, Dio, Vegetius, Josephus, Caesar, Ammianus, or on Trajan's Column. That accuracy note is the closest thing the project has to a product claim. One fluent invention reaching the Codex would quietly void it, and nobody would notice — which is exactly what makes it the dangerous failure, not a loud one.

**No generated orders.** A model plays hex tactics worse than a scoring function that reads the real combat formulas, and it would make the enemy turn nondeterministic, which is what `test/perf-parity.test.ts` and the fixed-roll tests exist to prevent.

**No claim the local layer has not already verified.** This is what makes prompt-level instruction sufficient rather than hopeful: the model is not being asked to be honest about a domain it could be wrong about. It is being asked to rephrase six sentences.

None of that is about model size. A larger model invents Roman history *more* fluently, not less.

### Shape

- `POST /api/counsel`, guarded by `OPENAI_API_KEY` in the environment. Absent, the route answers 501 and `GET /api/state` reports `counsel: false`, so the client never builds a button that cannot work.
- `gpt-5.6-luna` on the Responses API — the cheapest general-purpose model on the platform at $0.20/$1.20 per MTok, which is ample for rephrasing two sentences. A call is roughly 400 in and 60 out, about $0.00015. Both the model and the endpoint are env-var overridable (`COUNSEL_MODEL`, `COUNSEL_URL`), which is one line to change and is also how the whole path is tested against a stub.
- **No new dependency.** One endpoint, one POST, `fetch`. `express` is still the only runtime dependency.
- 6-second timeout via `AbortController`, zero retries, one call per turn, fired by a button, never automatically. The advice resets when the turn ends, because it was about the board as it stood.
- The reply is rendered with `textContent` and truncated at 400 characters. Model output never touches `innerHTML`.

### Failure is the default rendering

The local tips are what the panel shows. They are shown before the request, during it, and after it fails. Counsel is added beneath them when it arrives. There is no state in which the player is waiting on the network to take a turn, and no state in which a failure costs them anything but the phrasing.

## Alternatives considered

**A local model through LM Studio.** Keeps the "nothing leaves your machine" promise intact, which is a real loss to give up. Rejected on the same grounds it would have been accepted on: the constraint that matters is what the model is allowed to assert, and that constraint is identical either way — so the deciding factor became reliability and setup cost, and a hosted endpoint wins both for a single player. `COUNSEL_URL` means pointing this at LM Studio is one environment variable, so the door is not shut.

**Giving the model the board state and asking for counsel.** More useful when right, and it can be confidently wrong about an engine whose rules it has never seen. Rejected.

**The `openai` SDK.** One HTTP call does not need a dependency, and this project has exactly one runtime dependency and says so in its README.

## Consequences

**The README no longer says nothing leaves the machine, because it would be a lie.** It says the game is fully playable with no key and no network, and that one optional button sends this turn's already-computed advice to be rephrased.

The key is the human's to place, in `.env` or the environment. It is never sent to the client, never logged, never in a diff; `.env` was already git-ignored. A failed request logs the status, the scenario and the turn, never the body — an error body can quote the request back.

If this is ever released MIT and public, the cost falls on whoever clones it, and the game works with no key at all, so nothing about that release needs a key to exist.

18 tests in `test/counsel.test.ts`, none of which call the real API: every one injects a fetcher. They cover no key, empty facts, a refused status, a dead network, a timeout, four reply shapes nobody expected, and an assertion that no field of the save travels with the ask.
