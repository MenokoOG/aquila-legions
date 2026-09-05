import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import type { SaveState } from "../shared/types.js";

/** JSON-file persistence for the single local commander. */
export class SaveStore {
  constructor(private readonly path: string) {}

  load(): SaveState {
    if (!existsSync(this.path)) return this.fresh();
    try {
      const raw = JSON.parse(readFileSync(this.path, "utf8")) as Partial<SaveState>;
      if (raw.version !== 1) return this.fresh();
      return { ...this.fresh(), ...raw };
    } catch {
      return this.fresh();
    }
  }

  save(state: SaveState): void {
    mkdirSync(dirname(this.path), { recursive: true });
    const next = { ...state, updatedAt: new Date().toISOString() };
    writeFileSync(this.path, JSON.stringify(next, null, 2), "utf8");
  }

  fresh(): SaveState {
    return {
      version: 1,
      commander: "Legatus",
      historyPoints: 0,
      rank: "Tiro (Recruit)",
      scenarios: {},
      codexUnlocked: [],
      battles: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}
