import type { Hex } from "../../shared/types.js";

/**
 * Short-lived visual feedback: the numbers that float off a unit when it is hit.
 * Kept out of the rules and out of the renderer so both stay about one thing.
 */

export interface Floater {
  at: Hex;
  text: string;
  tone: "hit" | "friendly" | "rout";
  born: number;
}

const LIFE_MS = 1100;

export class Effects {
  private items: Floater[] = [];

  add(at: Hex, text: string, tone: Floater["tone"]): void {
    this.items.push({ at: { ...at }, text, tone, born: performance.now() });
  }

  /** Drops what has faded out and returns what is still on screen. */
  alive(now = performance.now()): { f: Floater; age: number }[] {
    this.items = this.items.filter((f) => now - f.born < LIFE_MS);
    return this.items.map((f) => ({ f, age: (now - f.born) / LIFE_MS }));
  }

  get active(): boolean {
    return this.items.length > 0;
  }

  clear(): void {
    this.items = [];
  }
}
