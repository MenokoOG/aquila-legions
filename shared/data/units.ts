import type { UnitTemplate } from "../types.js";
import { ROME_UNITS } from "./units-rome.js";
import { DACIA_UNITS } from "./units-dacia.js";
import { BRITANNIA_UNITS } from "./units-britannia.js";

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
  ...BRITANNIA_UNITS,
} as const satisfies Record<string, UnitTemplate>;

export type UnitKind = keyof typeof UNITS;

/**
 * The roster files, for a field manual that groups what it shows. The split is
 * the one the files already make: the legion is shared across eras, and each
 * campaign's own file holds everything that campaign adds, on both sides.
 */
export const ROSTERS: { id: string; title: string; blurb: string; units: Record<string, UnitTemplate> }[] = [
  {
    id: "rome", title: "The Legion",
    blurb: "The army the player commands in every era. An era that fields different Roman troops adds to this rather than replacing it.",
    units: ROME_UNITS,
  },
  {
    id: "dacia", title: "The Dacian Wars",
    blurb: "Decebalus's army and his Sarmatian allies, 101 to 106 AD.",
    units: DACIA_UNITS,
  },
  {
    id: "britannia", title: "The Boudican Revolt",
    blurb: "The host that burned three towns in 60 and 61 AD, and the Romans caught up in it.",
    units: BRITANNIA_UNITS,
  },
];

export function unitTemplate(kind: string): UnitTemplate | undefined {
  return (UNITS as Record<string, UnitTemplate>)[kind];
}
