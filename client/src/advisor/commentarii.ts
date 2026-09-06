import type { CommentariusEntry } from "../../../shared/types.js";
import { TRIGGERS } from "../../../shared/data/triggers.js";
import { testObjective } from "../../../shared/objectives.js";
import { type BattleState, metrics } from "../engine/battle.js";
import type { Tip } from "./tips.js";

/**
 * The notebook, and the notes that file themselves into it.
 *
 * A trigger is a comparison against a battle metric, judged by the same
 * comparator objectives use, so "the first time you form a tortoise under fire"
 * is data rather than a branch in the engine. Firing is idempotent: an id
 * already in the notebook never fires again, in this battle or any later one.
 */

/** Which notes have just become true and are not already filed. */
export function firedTriggers(s: BattleState, filed: ReadonlySet<string>): CommentariusEntry[] {
  const bag = metrics(s);
  const out: CommentariusEntry[] = [];
  for (const t of TRIGGERS) {
    if (filed.has(t.id)) continue;
    if (!testObjective({ id: t.id, text: "", metric: t.metric, compare: t.compare, value: t.value, points: 0, hint: "" }, bag)) {
      continue;
    }
    out.push({
      id: t.id,
      source: "trigger",
      title: t.title,
      body: t.note,
      tags: t.tags,
      scenarioId: s.scenario.id,
      at: new Date().toISOString(),
    });
  }
  return out;
}

/** A tip the player wanted to keep. */
export function noteFromTip(s: BattleState, tip: Tip): CommentariusEntry {
  return {
    id: `tip:${s.scenario.id}:${tip.id}`,
    source: "tip",
    title: `${s.scenario.title}, turn ${s.turn}`,
    body: tip.text,
    tags: ["praefectus", s.scenario.tactic.toLowerCase()],
    scenarioId: s.scenario.id,
    at: new Date().toISOString(),
  };
}

/** The prefect's own words, kept. */
export function noteFromCounsel(s: BattleState, text: string): CommentariusEntry {
  return {
    id: `counsel:${s.scenario.id}:${s.turn}`,
    source: "tip",
    title: `The Praefectus at ${s.scenario.title}, turn ${s.turn}`,
    body: text,
    tags: ["praefectus", "counsel"],
    scenarioId: s.scenario.id,
    at: new Date().toISOString(),
  };
}

/** Every tag in the notebook, most used first, for the filter row. */
export function tagsOf(entries: readonly CommentariusEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const e of entries) for (const t of e.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}
