import { button, clear, el } from "./dom.js";

/** One modal layer. Content is built by the caller; this file only shows and hides it. */

export interface ModalAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export function showModal(title: string, body: HTMLElement, actions: ModalAction[]): void {
  const root = document.getElementById("modal");
  if (!root) return;
  clear(root);
  const card = el("div", { class: "modal-card" },
    el("h2", { class: "modal-title", text: title }),
    body,
    el("div", { class: "modal-actions" },
      ...actions.map((a) => button(a.label, () => { hideModal(); a.onClick(); }, a.primary ? "btn primary" : "btn")),
    ),
  );
  root.append(card);
  root.hidden = false;
}

export function hideModal(): void {
  const root = document.getElementById("modal");
  if (!root) return;
  root.hidden = true;
  clear(root);
}
