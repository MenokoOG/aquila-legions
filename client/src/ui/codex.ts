import type { CodexView } from "../api.js";
import { CAMPAIGNS } from "../../../shared/data/campaigns.js";
import { CODEX_CAMPAIGN } from "../../../shared/data/codex.js";
import { ROSTERS } from "../../../shared/data/units.js";
import { FORMATIONS } from "../../../shared/data/formations.js";
import { TERRAIN } from "../../../shared/data/terrain.js";
import { button, clear, el } from "./dom.js";

/**
 * Codex screen: unlocked history, plus the always-open field manual.
 *
 * With one era this was a flat grid and that was fine. With two it is fifty-odd
 * cards, so everything on this screen is grouped by the era it belongs to and
 * the era chips filter the lot. Which era an entry belongs to is derived from
 * the battle that unlocks it, not written down twice.
 */

function entryCard(e: CodexView): HTMLElement {
  if (!e.unlocked) {
    return el("article", { class: "codex-entry locked" },
      el("div", { class: "codex-era", text: "Locked" }),
      el("h3", { text: e.title }),
      el("p", { text: "Win the battle that teaches this to read it." }),
    );
  }
  return el("article", { class: "codex-entry" },
    el("div", { class: "codex-era", text: e.era }),
    el("h3", { text: e.title }),
    ...e.body.map((p) => el("p", { text: p })),
    el("div", { class: "tags" }, ...e.tags.map((t) => el("span", { class: "tag", text: t }))),
  );
}

function unitCard(u: (typeof ROSTERS)[number]["units"][string]): HTMLElement {
  const stats = [
    `${u.men} men`, `attack ${u.attack}`, `defense ${u.defense}`, `move ${u.move}`,
    u.range ? `range ${u.range}` : null,
    u.pila ? "pila" : null,
    u.mounted ? "mounted" : null,
    u.canFormation ? "formations" : null,
    u.brittle ? "brittle" : null,
  ].filter(Boolean).join(" · ");
  return el("article", { class: `manual-card ${u.side}` },
    el("h4", {}, `${u.name} `, el("span", { class: "latin", text: u.latin })),
    el("div", { class: "manual-rule", text: stats }),
    el("p", { text: u.blurb }),
  );
}

export function renderCodex(entries: CodexView[], onBack: () => void): HTMLElement {
  const eras = [...CAMPAIGNS].sort((a, b) => a.order - b.order);
  const unlocked = entries.filter((e) => e.unlocked).length;

  /** null is "everything". */
  let filter: string | null = null;

  const chips = el("div", { class: "tag-filter" });
  const body = el("div", {});

  function entriesOf(campaignId: string): CodexView[] {
    return entries.filter((e) => CODEX_CAMPAIGN[e.id] === campaignId);
  }

  function section(title: string, sub: string | null, cards: HTMLElement[], cls = "codex-grid"): HTMLElement {
    return el("div", { class: "codex-section" },
      el("h2", { text: title }),
      sub ? el("p", { class: "muted small", text: sub }) : null,
      el("div", { class: cls }, ...cards),
    );
  }

  function drawChips(): void {
    clear(chips);
    const chip = (label: string, id: string | null): HTMLElement => {
      const on = filter === id;
      const b = button(label, () => { filter = id; draw(); }, `btn chip${on ? " active" : ""}`);
      b.setAttribute("aria-pressed", String(on));
      return b;
    };
    chips.append(chip("Everything", null));
    for (const c of eras) {
      const mine = entriesOf(c.id);
      const got = mine.filter((e) => e.unlocked).length;
      chips.append(chip(`${c.title} · ${got}/${mine.length}`, c.id));
    }
  }

  function draw(): void {
    drawChips();
    clear(body);

    // History, one section per era, unlocked entries first within each.
    for (const c of eras) {
      if (filter && filter !== c.id) continue;
      const mine = entriesOf(c.id);
      if (!mine.length) continue;
      const ordered = [...mine.filter((e) => e.unlocked), ...mine.filter((e) => !e.unlocked)];
      const got = ordered.filter((e) => e.unlocked).length;
      body.append(section(
        c.title,
        `${c.subtitle} — ${got} of ${ordered.length} unlocked.`,
        ordered.map(entryCard),
      ));
    }

    // The field manual is always open: it is rules, not history, and a player
    // stuck on a formation should not have to win a battle to read what it does.
    body.append(section(
      "Field manual · Formations", null,
      Object.entries(FORMATIONS).map(([id, f]) => el("article", { class: "manual-card" },
        el("h4", {}, `${f.name} `, el("span", { class: "latin", text: f.latin })),
        el("div", { class: "manual-rule", text: f.short }),
        el("p", { text: f.history }),
        el("div", { class: "tags" }, el("span", { class: "tag", text: id })),
      )),
      "manual-grid",
    ));

    body.append(section(
      "Field manual · Ground", null,
      Object.values(TERRAIN).map((t) => el("article", { class: "manual-card" },
        el("h4", { text: t.name }),
        el("div", { class: "manual-rule", text: t.cost === null
          ? "Impassable"
          : `Costs ${t.cost} to enter · defense ×${t.defense}` }),
        el("p", { text: t.blurb }),
      )),
      "manual-grid",
    ));

    for (const roster of ROSTERS) {
      // The legion is in every era, so it is shown whatever is filtered.
      if (filter && filter !== roster.id && roster.id !== "rome") continue;
      body.append(section(
        `Field manual · ${roster.title}`,
        roster.blurb,
        Object.values(roster.units).map(unitCard),
        "manual-grid",
      ));
    }
  }

  draw();

  return el("section", { class: "codex" },
    el("div", { class: "screen-head" },
      el("h1", { text: "Codex" }),
      el("div", { class: "codex-count", text: `${unlocked} of ${entries.length} entries unlocked` }),
      button("Back to campaign", onBack),
    ),
    chips,
    body,
  );
}
