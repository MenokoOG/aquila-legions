import type { CommentariusEntry, SaveState } from "../shared/types.js";
import { SCENARIO_BY_ID } from "../shared/data/scenarios.js";
import { sanitizeCommentarii } from "./progress.js";

/**
 * The notebook as a file.
 *
 * The library rule this project is built to says anything worth keeping is a
 * file in a repository, so the export is a real markdown document the player
 * can commit, not a screen they can only look at.
 */

const SOURCE_LABEL: Record<CommentariusEntry["source"], string> = {
  trigger: "Noticed in the field",
  codex: "Codex",
  tip: "The Praefectus",
};

function heading(save: SaveState): string[] {
  return [
    "# Commentarii",
    "",
    `${save.commander}, ${save.rank}. ${save.historyPoints} history points over ${save.battles} battles.`,
    "",
    `Exported ${new Date().toISOString().slice(0, 10)} from Aquila: Legions of Trajan.`,
    "",
  ];
}

function entry(e: CommentariusEntry): string[] {
  const where = e.scenarioId ? SCENARIO_BY_ID[e.scenarioId]?.title ?? e.scenarioId : null;
  const meta = [SOURCE_LABEL[e.source], where, e.at.slice(0, 10)].filter(Boolean).join(" · ");
  const lines = [`## ${e.title}`, "", `*${meta}*`, "", e.body, ""];
  if (e.tags.length) lines.push(e.tags.map((t) => `\`${t}\``).join(" "), "");
  return lines;
}

export function toMarkdown(save: SaveState): string {
  if (!save.commentarii.length) {
    return [...heading(save), "The notebook is empty. Fight a battle.", ""].join("\n");
  }
  return [...heading(save), ...save.commentarii.flatMap(entry)].join("\n");
}

/**
 * Files new notes, keeping the first version of anything already filed. A note
 * is a record of the moment it fired, so re-filing it would move the date.
 */
export function file(save: SaveState, incoming: unknown): CommentariusEntry[] {
  const clean = sanitizeCommentarii(incoming);
  const known = new Set(save.commentarii.map((e) => e.id));
  const added = clean.filter((e) => !known.has(e.id));
  save.commentarii = [...save.commentarii, ...added];
  return added;
}
