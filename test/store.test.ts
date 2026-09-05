import { ok, strictEqual } from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { SaveStore } from "../server/store.js";

const dirs: string[] = [];

function tempSave(): string {
  const dir = mkdtempSync(join(tmpdir(), "aquila-"));
  dirs.push(dir);
  return join(dir, "save.json");
}

after(() => {
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
});

describe("the save file", () => {
  it("starts a fresh campaign when there is nothing on disk", () => {
    const save = new SaveStore(tempSave()).load();
    strictEqual(save.historyPoints, 0);
    strictEqual(save.battles, 0);
  });

  it("survives a round trip", () => {
    const path = tempSave();
    const store = new SaveStore(path);
    const save = store.fresh();
    save.commander = "Marcus";
    save.historyPoints = 250;
    store.save(save);
    const back = new SaveStore(path).load();
    strictEqual(back.commander, "Marcus");
    strictEqual(back.historyPoints, 250);
  });

  it("does not lose the campaign to a file someone broke", () => {
    const path = tempSave();
    writeFileSync(path, "{ not json at all", "utf8");
    const save = new SaveStore(path).load();
    strictEqual(save.historyPoints, 0);
  });

  it("leaves no temp file behind after a write", () => {
    const path = tempSave();
    const store = new SaveStore(path);
    store.save(store.fresh());
    const stray = readdirSync(join(path, "..")).filter((f) => f.endsWith(".tmp"));
    strictEqual(stray.length, 0);
  });

  it("stamps the time of the last change", () => {
    const path = tempSave();
    const store = new SaveStore(path);
    store.save(store.fresh());
    const raw = JSON.parse(readFileSync(path, "utf8")) as { updatedAt: string };
    ok(!Number.isNaN(Date.parse(raw.updatedAt)));
  });
});
