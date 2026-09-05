import type { Campaign } from "../types.js";

/**
 * The eras. A campaign owns the words the game uses for its two armies, which is
 * the whole reason the engine can stay ignorant of who is fighting: the rules
 * deal in "player" and "enemy", and this file decides what the player reads.
 */
export const CAMPAIGNS: Campaign[] = [
  {
    id: "dacia",
    order: 1,
    title: "Legions of Trajan",
    subtitle: "The Dacian Wars, 101 to 106 AD",
    blurb: "Six battles. Each one exists to teach a single thing the legion did well. Win, and the history behind the tactic unlocks in the Codex.",
    player: { name: "Rome", adjective: "Roman", plural: "The legion" },
    enemy: { name: "Dacia", adjective: "Dacian", plural: "The Dacians" },
  },
];

export const CAMPAIGN_BY_ID: Record<string, Campaign> = Object.fromEntries(
  CAMPAIGNS.map((c) => [c.id, c]),
);

const FALLBACK = CAMPAIGNS[0]!;

/** Never throws: a scenario pointing at a missing campaign still renders. */
export function campaignFor(campaignId: string): Campaign {
  return CAMPAIGN_BY_ID[campaignId] ?? FALLBACK;
}
