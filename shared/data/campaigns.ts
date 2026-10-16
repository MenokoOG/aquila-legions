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
  {
    id: "britannia",
    order: 2,
    title: "The Burning of Britain",
    subtitle: "The Boudican Revolt, 60 to 61 AD",
    blurb: "Six battles about ground, frontage and nerve. Dacia taught you what a legion does; this one is won and lost by where you choose to stand, and by whether ten thousand men can be made to look like enough.",
    player: { name: "Rome", adjective: "Roman", plural: "The legion" },
    enemy: { name: "Britain", adjective: "British", plural: "The Britons" },
    hosts: {
      raw: {
        name: "A host that does not manoeuvre",
        blurb: "They come on as one mass, sure of their numbers. Tacitus gives the Britons no order beyond weight, and weight is what the whole campaign is about answering.",
      },
    },
  },
  {
    id: "judaea",
    order: 3,
    title: "The Rock and the City",
    subtitle: "The Jewish War, 67 to 73 AD",
    blurb: "Five sieges. The enemy will not come out and fight, so the legion builds: a bank, a wall round a whole city, a ramp up a rock. One of these is won by holding a line, not by clearing it.",
    player: { name: "Rome", adjective: "Roman", plural: "The legion" },
    enemy: { name: "Judaea", adjective: "Judaean", plural: "The defenders" },
    hosts: {
      raw: {
        name: "A garrison behind a wall",
        blurb: "They hold what they have and do not sortie. The wall is doing most of the work, and the wall is what you came for.",
      },
    },
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
