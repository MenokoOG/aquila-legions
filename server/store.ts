import {
  copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync,
} from "node:fs";
import { dirname } from "node:path";
import type { SaveState } from "../shared/types.js";
import { SAVE_VERSION, freshSave, sanitizeSave } from "./progress.js";

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
   * A copy of the file as it stands, kept once, before this build first writes
   * a shape an older build could not read. `sanitizeSave` migrates a v1 file on
   * read, but a v1 build meeting the v2 file it produced would reject it and
   * start a fresh campaign, so the way back is a file copy.
   */
  private backupBeforeUpgrade(): void {
    if (!existsSync(this.path)) return;
    try {
      const raw = JSON.parse(readFileSync(this.path, "utf8")) as { version?: unknown };
      if (typeof raw.version !== "number" || raw.version >= SAVE_VERSION) return;
      const bak = `${this.path}.v${raw.version}.bak`;
      if (!existsSync(bak)) copyFileSync(this.path, bak);
    } catch {
      // An unreadable file has nothing worth keeping and `load` already resets it.
    }
  }

  /**
   * Written to a sibling file and renamed into place, so a crash mid-write leaves
   * the previous campaign intact rather than a truncated one.
   */
  save(state: SaveState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    this.backupBeforeUpgrade();
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
