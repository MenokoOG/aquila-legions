import type { Scenario } from "../types.js";
import { DACIA_SCENARIOS } from "./scenarios-dacia.js";
import { BRITANNIA_SCENARIOS } from "./scenarios-britannia.js";

/**
 * Every battle the game ships, assembled from the per-campaign files.
 *
 * `order` is the position within a campaign, not across the game, so the two
 * eras both count from one and `isUnlocked` reads the campaign a scenario
 * belongs to rather than a global sequence.
 */
export const SCENARIOS: Scenario[] = [...DACIA_SCENARIOS, ...BRITANNIA_SCENARIOS];

export const SCENARIO_BY_ID: Record<string, Scenario> = Object.fromEntries(
  SCENARIOS.map((s) => [s.id, s]),
);

/** The battles of one era, in the order they are fought. */
export function scenariosOf(campaignId: string): Scenario[] {
  return SCENARIOS.filter((s) => s.campaignId === campaignId).sort((a, b) => a.order - b.order);
}
