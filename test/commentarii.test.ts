import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import type { MetricBag, SaveState } from "../shared/types.js";
import { METRIC_KEYS } from "../shared/data/metrics.js";
import { SCENARIOS } from "../shared/data/scenarios.js";
import { applyResult, freshSave, sanitizeCommentarii, sanitizeSave } from "../server/progress.js";
import { file, toMarkdown } from "../server/commentarii.js";
import { SaveStore } from "../server/store.js";

/**
 * The notebook is the only thing in the game that persists prose the player did
 * not write, and it changed the save shape to do it. These cover both halves:
 * that a v1 campaign survives meeting this build, and that what goes into the
 * notebook is cleaned the way everything else that crosses the wire is.
 */

const dirs: string[] = [];

function tempSave(): string {
  const dir = mkdtempSync(join(tmpdir(), "aquila-notes-"));
  dirs.push(dir);
  return join(dir, "save.json");
}

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

/** A save exactly as version 1 wrote it: no `commentarii`, and version 1. */
function v1Save(): Record<string, unknown> {
  return {
    version: 1,
    commander: "Longinus",
    historyPoints: 275,
    rank: "Tiro (Recruit)",
    scenarios: {
      castra: { completed: true, bestPoints: 150, attempts: 2, objectivesMet: ["win", "no_cohort_routed"] },
    },
    codexUnlocked: ["pilum"],
    battles: 2,
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
}

function bag(over: Partial<MetricBag> = {}): MetricBag {
  const m = {} as MetricBag;
  for (const k of METRIC_KEYS) m[k] = 0;
  return { ...m, ...over };
}

describe("the v1 to v2 migration", () => {
  it("keeps everything a version 1 campaign had earned", () => {
    const clean = sanitizeSave(v1Save());
    strictEqual(clean.version, 2);
    strictEqual(clean.commander, "Longinus");
    strictEqual(clean.historyPoints, 275);
    strictEqual(clean.battles, 2);
    deepStrictEqual(clean.codexUnlocked, ["pilum"]);
    deepStrictEqual(clean.scenarios.castra?.objectivesMet, ["win", "no_cohort_routed"]);
    deepStrictEqual(clean.commentarii, [], "and gains an empty notebook");
  });

  it("still refuses a version it has never heard of", () => {
    strictEqual(sanitizeSave({ ...v1Save(), version: 99 }).historyPoints, 0);
  });

  it("keeps a copy of the version 1 file before the first version 2 write", () => {
    const path = tempSave();
    writeFileSync(path, JSON.stringify(v1Save()), "utf8");
    const store = new SaveStore(path);

    const loaded = store.load();
    strictEqual(loaded.version, 2, "reading migrates it");
    store.save(loaded);

    const bak = `${path}.v1.bak`;
    ok(existsSync(bak), "the way back is a file copy");
    const kept = JSON.parse(readFileSync(bak, "utf8")) as { version: number; historyPoints: number };
    strictEqual(kept.version, 1);
    strictEqual(kept.historyPoints, 275);
  });

  it("does not overwrite that copy on every later write", () => {
    const path = tempSave();
    writeFileSync(path, JSON.stringify(v1Save()), "utf8");
    const store = new SaveStore(path);
    store.save(store.load());
    const first = readFileSync(`${path}.v1.bak`, "utf8");

    const save = store.load();
    save.historyPoints = 9999;
    store.save(save);
    strictEqual(readFileSync(`${path}.v1.bak`, "utf8"), first, "the backup is of the v1 file, once");
  });

  it("takes no backup of a campaign that was already version 2", () => {
    const path = tempSave();
    const store = new SaveStore(path);
    store.save(store.fresh());
    store.save(store.load());
    ok(!existsSync(`${path}.v2.bak`));
    ok(!existsSync(`${path}.v1.bak`));
  });
});

describe("filing a note", () => {
  it("drops anything without an id or a title, and never files one twice", () => {
    const clean = sanitizeCommentarii([
      { id: "a", title: "Kept", body: "A note.", tags: ["x"], scenarioId: "castra", at: "2026-09-01" },
      { id: "a", title: "The same id again", body: "" },
      { id: "", title: "No id" },
      { id: "b" },
      "not an entry",
      null,
    ]);
    strictEqual(clean.length, 1);
    strictEqual(clean[0]?.id, "a");
    strictEqual(clean[0]?.scenarioId, "castra");
  });

  it("drops a scenario id the game does not have, rather than believing it", () => {
    const clean = sanitizeCommentarii([{ id: "a", title: "T", scenarioId: "atlantis" }]);
    strictEqual(clean[0]?.scenarioId, "");
  });

  it("defaults an unknown source to a tip rather than trusting the label", () => {
    const clean = sanitizeCommentarii([{ id: "a", title: "T", source: "gospel" }]);
    strictEqual(clean[0]?.source, "tip");
  });

  it("keeps the first version of a note the player already has", () => {
    const save = freshSave();
    file(save, [{ id: "first_pila", title: "The volley", body: "Original.", at: "2026-01-01T00:00:00.000Z" }]);
    const added = file(save, [{ id: "first_pila", title: "The volley", body: "Rewritten." }]);
    strictEqual(added.length, 0);
    strictEqual(save.commentarii.length, 1);
    strictEqual(save.commentarii[0]?.body, "Original.", "a note records the moment it fired");
  });
});

describe("the codex files itself", () => {
  it("puts every entry a victory unlocks into the notebook", () => {
    const save = freshSave();
    const first = SCENARIOS[0]!;
    applyResult(save, { scenarioId: first.id, stats: { won: true, metrics: bag() } });
    for (const id of first.unlocksCodex) {
      ok(save.commentarii.some((e) => e.id === `codex:${id}`), `${id} was not filed`);
    }
  });
});

describe("the markdown export", () => {
  function saveWithNotes(): SaveState {
    const save = freshSave();
    save.commander = "Longinus";
    file(save, [
      { id: "first_pila", source: "trigger", title: "The volley before the sword", body: "Two paragraphs.", tags: ["pilum"], scenarioId: "castra", at: "2026-09-01T10:00:00.000Z" },
      { id: "tip:castra:clock", source: "tip", title: "Castra, turn 9", body: "Two turns left.", tags: ["praefectus"], scenarioId: "castra", at: "2026-09-01T10:05:00.000Z" },
    ]);
    return save;
  }

  it("writes a document with the commander at the top and every note under it", () => {
    const md = toMarkdown(saveWithNotes());
    ok(md.startsWith("# Commentarii"));
    ok(md.includes("Longinus"));
    ok(md.includes("## The volley before the sword"));
    ok(md.includes("## Castra, turn 9"));
    ok(md.includes("The Marching Camp"), "and names the battle, not its id");
    ok(md.includes("`pilum`"));
  });

  it("says so plainly when there is nothing in it", () => {
    ok(toMarkdown(freshSave()).includes("The notebook is empty"));
  });
});
