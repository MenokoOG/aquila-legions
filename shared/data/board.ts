import type { Hex, Terrain } from "../types.js";

/** Small helpers so a scenario file reads as a map rather than as a loop. */

/**
 * Terrain written the way it is drawn: one line per kind, listing the hexes it
 * covers. Anything unlisted is open ground.
 */
export function terrain(spec: Partial<Record<Terrain, [number, number][]>>): Record<string, Terrain> {
  const out: Record<string, Terrain> = {};
  for (const [kind, cells] of Object.entries(spec) as [Terrain, [number, number][]][]) {
    for (const [q, r] of cells) out[`${q},${r}`] = kind;
  }
  return out;
}

/** A list of hexes from a list of pairs, for key ground and map exits. */
export function hexes(cells: [number, number][]): Hex[] {
  return cells.map(([q, r]) => ({ q, r }));
}
