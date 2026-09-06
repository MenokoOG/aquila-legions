import type { CommentariusEntry } from "../../../shared/types.js";
import { SCENARIO_BY_ID } from "../../../shared/data/scenarios.js";
import { tagsOf } from "../advisor/commentarii.js";
import { button, clear, el } from "./dom.js";

/** The Commentarii screen: everything the campaign has taught you, filterable by tag. */

const SOURCE_LABEL: Record<CommentariusEntry["source"], string> = {
  trigger: "Noticed in the field",
  codex: "Codex",
  tip: "The Praefectus",
};

function card(e: CommentariusEntry): HTMLElement {
  const where = e.scenarioId ? SCENARIO_BY_ID[e.scenarioId]?.title ?? null : null;
  return el("article", { class: `codex-entry note-${e.source}` },
    el("div", { class: "codex-era", text: [SOURCE_LABEL[e.source], where].filter(Boolean).join(" · ") }),
    el("h3", { text: e.title }),
    ...e.body.split("\n\n").map((p) => el("p", { text: p })),
    e.tags.length ? el("div", { class: "tags" }, ...e.tags.map((t) => el("span", { class: "tag", text: t }))) : null,
  );
}

export function renderCommentarii(entries: CommentariusEntry[], onBack: () => void): HTMLElement {
  const tags = tagsOf(entries);
  let active: string | null = null;

  const list = el("div", { class: "codex-grid" });
  const filters = el("div", { class: "tag-filter" });

  function draw(): void {
    clear(list);
    const shown = active ? entries.filter((e) => e.tags.includes(active!)) : entries;
    if (!shown.length) {
      list.append(el("p", { class: "muted", text: entries.length
        ? "Nothing filed under that tag."
        : "The notebook is empty. Fight a battle: the first tortoise you form under fire writes its own page." }));
    }
    // Newest first: the thing you just learned is the thing you came to read.
    list.append(...[...shown].reverse().map(card));

    clear(filters);
    filters.append(chip("All", active === null, () => { active = null; draw(); }));
    for (const t of tags) filters.append(chip(t, active === t, () => { active = t; draw(); }));
  }

  function chip(label: string, on: boolean, onClick: () => void): HTMLElement {
    const b = button(label, onClick, `btn chip${on ? " active" : ""}`);
    b.setAttribute("aria-pressed", String(on));
    return b;
  }

  draw();

  // A link rather than a scripted download: the server writes the file, and the
  // browser saves it under the name the response asks for.
  const download = el("a", { class: "btn quiet", href: "/api/commentarii.md" }, "Export as markdown") as HTMLAnchorElement;
  download.setAttribute("download", "commentarii.md");

  return el("section", { class: "codex" },
    el("div", { class: "screen-head" },
      el("h1", { text: "Commentarii" }),
      el("div", { class: "codex-count", text: `${entries.length} ${entries.length === 1 ? "note" : "notes"} kept` }),
      download,
      button("Back to campaign", onBack),
    ),
    filters,
    list,
  );
}
