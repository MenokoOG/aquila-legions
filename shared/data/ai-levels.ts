/**
 * How well the enemy fights, as capabilities rather than as a difficulty number.
 *
 * A scenario picks a level, so the Dacians get better as the campaign goes on:
 * the first two battles are a probe by men who come straight at you, and by
 * Sarmizegetusa you are fighting a host that concentrates, waits for its
 * neighbours, and declines a trade it would lose. That progression is the
 * teaching order — a lesson you are still learning should not be examined by
 * the best opponent in the game.
 */

import type { AiLevel, AiPolicy, Campaign } from "../types.js";

export const AI_LEVELS: Record<AiLevel, AiPolicy> = {
  raw: {
    name: "A probe",
    blurb: "They come straight at you, each man for himself.",
    weighPositions: false, focusFire: false, weighTrades: false,
    kite: false, holdForSupport: false, useTerrain: false,
  },
  seasoned: {
    name: "A war host",
    blurb: "They pick their ground, concentrate on one cohort, and keep their archers off your swords.",
    weighPositions: true, focusFire: true, weighTrades: false,
    kite: true, holdForSupport: false, useTerrain: false,
  },
  veteran: {
    name: "Decebalus's own",
    blurb: "They form up before they commit, take the high ground, and will not trade a warband for nothing.",
    weighPositions: true, focusFire: true, weighTrades: true,
    kite: true, holdForSupport: true, useTerrain: true,
  },
};

/** The level a scenario fights at. Unset means the middle one. */
export function policyFor(level: AiLevel | undefined): AiPolicy {
  return AI_LEVELS[level ?? "seasoned"];
}

/**
 * What the briefing calls the enemy in front of you. The level says what it can
 * do; the campaign says what to call it, because the same capability is a probe
 * in one war and an army past counting in the next.
 */
export function hostWording(
  campaign: Campaign, level: AiLevel | undefined,
): { name: string; blurb: string } {
  const policy = policyFor(level);
  return campaign.hosts?.[level ?? "seasoned"] ?? { name: policy.name, blurb: policy.blurb };
}
