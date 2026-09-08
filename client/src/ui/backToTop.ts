import { el } from "./dom.js";

/**
 * The way back up a long page.
 *
 * The Codex is fifty-odd cards across two eras, and the Commentarii grows for
 * as long as the player keeps filing notes. Both scroll well past a screen, and
 * the only way back to the era chips and the Back button was a long drag on the
 * wheel. This is one fixed button that appears once there is something to
 * scroll back to.
 *
 * It lives on the document, not on a screen, so every screen gets it and no
 * screen has to remember to ask. It sits bottom-left because the toast stack
 * owns bottom-right.
 */

/** How far down the page has to be before the button is worth showing. */
export const SHOW_AFTER = 480;

/**
 * Whether the button belongs on screen at this scroll position.
 *
 * Kept apart from the DOM so the rule can be read and tested on its own: it is
 * the only decision this file makes.
 */
export function shouldShow(scrollY: number): boolean {
  return Number.isFinite(scrollY) && scrollY > SHOW_AFTER;
}

let node: HTMLButtonElement | null = null;

function scrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

function sync(): void {
  if (!node) return;
  node.classList.toggle("show", shouldShow(scrollTop()));
}

/**
 * Puts the button on the page once and keeps it in step with the scroll
 * position. Safe to call more than once; later calls do nothing.
 */
export function mountBackToTop(host: HTMLElement = document.body): void {
  if (node?.isConnected) return;

  node = el("button", {
    class: "back-to-top",
    type: "button",
    "aria-label": "Back to top of page",
    title: "Back to top",
  }, el("span", { class: "bt-arrow", "aria-hidden": "true", text: "▲" }), "Top");

  node.addEventListener("click", () => {
    // A player who has turned motion down gets the jump, not the glide.
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: smooth ? "smooth" : "auto" });
    // Focus goes back to the top of the document so the keyboard follows the eye.
    document.getElementById("topbar")?.querySelector("nav")?.querySelector<HTMLElement>("button, a")?.focus();
  });

  host.append(node);
  window.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync, { passive: true });
  // A screen swap changes the page height without scrolling, and the router
  // should not have to tell this file about it.
  new ResizeObserver(sync).observe(document.documentElement);
  sync();
}
