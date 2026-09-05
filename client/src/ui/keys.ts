/** Keyboard orders for the battle screen. One place, so the bindings are easy to read and change. */

export interface KeyHandlers {
  endTurn: () => void;
  undo: () => void;
  next: () => void;
  deselect: () => void;
  formation: (index: number) => void;
  attackMode: () => void;
  pilaMode: () => void;
  lesson: () => void;
  threat: () => void;
}

function typing(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  return !!node && (node.tagName === "INPUT" || node.tagName === "TEXTAREA" || node.isContentEditable);
}

/**
 * Once the player has tabbed onto a button, Tab and Space belong to the browser
 * again: taking them would trap focus and make the panel unusable by keyboard.
 */
function onControl(): boolean {
  const el = document.activeElement;
  return !!el && el !== document.body && ["BUTTON", "A", "SELECT"].includes(el.tagName);
}

function modalOpen(): boolean {
  return document.getElementById("modal")?.hidden === false;
}

/** Binds the battle keys and returns the function that unbinds them. */
export function bindKeys(h: KeyHandlers): () => void {
  const onKey = (ev: KeyboardEvent): void => {
    if (typing(ev.target) || modalOpen() || ev.altKey || ev.metaKey) return;
    if (ev.ctrlKey && ev.key.toLowerCase() !== "z") return;

    const handled = (fn: () => void): void => { ev.preventDefault(); fn(); };

    switch (ev.key.toLowerCase()) {
      case "enter": return onControl() ? undefined : handled(h.endTurn);
      case " ": return onControl() ? undefined : handled(h.endTurn);
      case "tab": return onControl() ? undefined : handled(h.next);
      case "n": return handled(h.next);
      case "escape": return handled(h.deselect);
      case "u": return handled(h.undo);
      case "z": return ev.ctrlKey ? handled(h.undo) : undefined;
      case "1": return handled(() => h.formation(0));
      case "2": return handled(() => h.formation(1));
      case "3": return handled(() => h.formation(2));
      case "4": return handled(() => h.formation(3));
      case "a": return handled(h.attackMode);
      case "p": return handled(h.pilaMode);
      case "l": return handled(h.lesson);
      case "t": return handled(h.threat);
      default: return undefined;
    }
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}
