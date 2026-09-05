import type { UnitTemplate } from "../types.js";
import { ROME_UNITS } from "./units-rome.js";
import { DACIA_UNITS } from "./units-dacia.js";

/**
 * The whole roster, assembled from the per-campaign files.
 *
 * `UnitKind` is derived from what is actually here rather than written out by
 * hand, so a new era adds a roster file and imports it below. Nothing else in
 * the game needs to learn the new names: the type follows the data.
 */
export const UNITS = {
  ...ROME_UNITS,
  ...DACIA_UNITS,
} as const satisfies Record<string, UnitTemplate>;

export type UnitKind = keyof typeof UNITS;

export function unitTemplate(kind: string): UnitTemplate | undefined {
  return (UNITS as Record<string, UnitTemplate>)[kind];
}
