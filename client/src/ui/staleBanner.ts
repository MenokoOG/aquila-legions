import { el } from "./dom.js";

/**
 * The warning for a server that is older than the page it is serving.
 *
 * A server left running across a `git pull` keeps serving the rebuilt `dist/`
 * off disk — `express.static` reads from the filesystem per request — while its
 * own routes, rules and save handling stay at whatever it loaded on startup.
 * The result is a current screen against a stale API: a campaign the client
 * would happily draw but the server never mentions, a save version the server
 * rejects, a route that answers 404. Nothing on the page says so, and the
 * symptom looks like a bug in the feature rather than in the process.
 *
 * It cost two rounds of wrong diagnosis once. Now it says so.
 */

/** Whether the API process predates the bundle it is serving. */
export function serverIsStale(startedAt: number | undefined, builtAt: number): boolean {
  if (typeof startedAt !== "number" || !Number.isFinite(startedAt)) return false;
  if (!Number.isFinite(builtAt) || builtAt <= 0) return false;
  return startedAt < builtAt;
}

export function staleBanner(): HTMLElement {
  return el("div", { class: "stale-banner", role: "alert" },
    el("strong", { text: "The server is older than this page. " }),
    el("span", {
      text: "It started before this build, so it is serving these screens off earlier"
        + " rules — campaigns, routes or save handling may be missing. Stop it and start it again.",
    }),
  );
}

/** Puts the warning at the top of the document, once. */
export function warnIfStale(startedAt: number | undefined, builtAt: number, host: HTMLElement): boolean {
  if (!serverIsStale(startedAt, builtAt)) return false;
  if (host.querySelector(".stale-banner")) return true;
  host.prepend(staleBanner());
  return true;
}
