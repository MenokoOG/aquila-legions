import type { CodexView } from "../api.js";
import { UNITS } from "../../../shared/data/units.js";
import { FORMATIONS } from "../../../shared/data/formations.js";
import { button, el } from "./dom.js";

/** Codex screen: unlocked history, plus the always-open field manual for units and formations. */

export function renderCodex(entries: CodexView[], onBack: () => void): HTMLElement {
  const unlocked = entries.filter((e) => e.unlocked);
  const locked = entries.filter((e) => !e.unlocked);

  const entryCard = (e: CodexView) => el("article", { class: "codex-entry" },
    el("div", { class: "codex-era", text: e.era }),
    el("h3", { text: e.title }),
    ...e.body.map((p) => el("p", { text: p })),
    el("div", { class: "tags" }, ...e.tags.map((t) => el("span", { class: "tag", text: t }))),
  );

  const lockedCard = (e: CodexView) => el("article", { class: "codex-entry locked" },
    el("div", { class: "codex-era", text: "Locked" }),
    el("h3", { text: e.title }),
    el("p", { text: "Win the battle that teaches this to read it." }),
  );

  const formations = Object.entries(FORMATIONS).map(([id, f]) => el("article", { class: "manual-card" },
    el("h4", {}, `${f.name} `, el("span", { class: "latin", text: f.latin })),
    el("div", { class: "manual-rule", text: f.short }),
    el("p", { text: f.history }),
    el("div", { class: "tags" }, el("span", { class: "tag", text: id })),
  ));

  const units = Object.values(UNITS).map((u) => el("article", { class: `manual-card ${u.side}` },
    el("h4", {}, `${u.name} `, el("span", { class: "latin", text: u.latin })),
    el("div", { class: "manual-rule", text: `${u.men} men · attack ${u.attack} · defense ${u.defense} · move ${u.move}${u.range ? ` · range ${u.range}` : ""}${u.pila ? " · pila" : ""}` }),
    el("p", { text: u.blurb }),
  ));

  return el("section", { class: "codex" },
    el("div", { class: "screen-head" },
      el("h1", { text: "Codex" }),
      el("div", { class: "codex-count", text: `${unlocked.length} of ${entries.length} entries unlocked` }),
      button("Back to campaign", onBack),
    ),
    el("h2", { text: "History" }),
    el("div", { class: "codex-grid" }, ...unlocked.map(entryCard), ...locked.map(lockedCard)),
    el("h2", { text: "Field manual · Formations" }),
    el("div", { class: "manual-grid" }, ...formations),
    el("h2", { text: "Field manual · Units" }),
    el("div", { class: "manual-grid" }, ...units),
  );
}
