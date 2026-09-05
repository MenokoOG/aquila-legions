import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { dirname } from "node:path";
import type { SaveState } from "../shared/types.js";
import { freshSave, sanitizeSave } from "./progress.js";

/** JSON-file persistence for the single local commander. */
export class SaveStore {
  constructor(private readonly path: string) {}

  /** A hand-edited or half-written file must never take the game down: fall back to a new save. */
  load(): SaveState {
    if (!existsSync(this.path)) return this.fresh();
    try {
      return sanitizeSave(JSON.parse(readFileSync(this.path, "utf8")));
    } catch {
      return this.fresh();
    }
  }

  /**
   * Written to a sibling file and renamed into place, so a crash mid-write leaves
   * the previous campaign intact rather than a truncated one.
   */
  save(state: SaveState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const next = { ...state, updatedAt: new Date().toISOString() };
    const tmp = `${this.path}.tmp`;
    try {
      writeFileSync(tmp, JSON.stringify(next, null, 2), "utf8");
      renameSync(tmp, this.path);
    } catch (err) {
      try { if (existsSync(tmp)) unlinkSync(tmp); } catch { /* the temp file is already gone */ }
      throw err;
    }
  }

  fresh(): SaveState {
    return freshSave();
  }
}
