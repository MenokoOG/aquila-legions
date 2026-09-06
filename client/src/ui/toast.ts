import { clear, el } from "./dom.js";

/**
 * The corner notice. Used for a note that has just filed itself into the
 * Commentarii, which is worth interrupting a glance but never a turn: it steals
 * no focus, blocks nothing, and the battle carries on underneath it.
 */

const LIFETIME = 7000;

let host: HTMLElement | null = null;

function stack(): HTMLElement {
  if (host?.isConnected) return host;
  host = el("div", { class: "toasts", role: "status", "aria-live": "polite" });
  document.body.append(host);
  return host;
}

export function toast(title: string, body: string, onOpen?: () => void): void {
  const node = el("div", { class: "toast" },
    el("div", { class: "toast-head", text: "Filed in the Commentarii" }),
    el("h4", { text: title }),
    el("p", { text: body.length > 220 ? `${body.slice(0, 217)}...` : body }),
  );
  if (onOpen) {
    const open = el("button", { class: "btn quiet small", type: "button" }, "Read it");
    open.addEventListener("click", onOpen);
    node.append(open);
  }
  const close = el("button", { class: "toast-close", type: "button", "aria-label": "Dismiss" }, "×");
  close.addEventListener("click", () => node.remove());
  node.append(close);

  stack().append(node);
  setTimeout(() => node.remove(), LIFETIME);
}

/** Drops every notice, for a screen change that should not leave one hanging. */
export function clearToasts(): void {
  if (host) clear(host);
}
