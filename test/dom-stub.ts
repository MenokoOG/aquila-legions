/**
 * Just enough DOM for `ui/dom.ts` to build a tree in Node.
 *
 * The two worst bugs shipped from this project so far were a button clipped out
 * of its card and a campaign tab rendered invisible — neither of which a
 * typechecker can see and neither of which any test could reach, because the
 * screens could not be built outside a browser. This is the smallest thing that
 * makes them reachable: structure and classes, no layout and no painting.
 *
 * It does not attempt to be a DOM. It attempts to let `renderMenu` and
 * `renderCodex` run so their output can be walked.
 */

export interface StubNode {
  tagName: string;
  className: string;
  textContent: string;
  children: StubNode[];
  parent: StubNode | null;
  attrs: Record<string, string>;
  disabled: boolean;
  title: string;
  firstChild: StubNode | null;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  append(...nodes: (StubNode | string | null | undefined)[]): void;
  prepend(...nodes: (StubNode | string | null | undefined)[]): void;
  removeChild(child: StubNode): void;
  addEventListener(type: string, fn: () => void): void;
  click(): void;
  querySelector(sel: string): StubNode | null;
}

function node(tagName: string): StubNode {
  const self: StubNode = {
    tagName,
    className: "",
    textContent: "",
    children: [],
    parent: null,
    attrs: {},
    disabled: false,
    title: "",
    get firstChild() { return self.children[0] ?? null; },
    setAttribute(name, value) { self.attrs[name] = value; },
    getAttribute(name) { return self.attrs[name] ?? null; },
    append(...nodes) {
      for (const n of nodes) {
        if (n === null || n === undefined) continue;
        if (typeof n === "string") { self.textContent += n; continue; }
        n.parent = self;
        self.children.push(n);
      }
    },
    prepend(...nodes) {
      const kept = self.children.splice(0, self.children.length);
      self.append(...nodes);
      self.children.push(...kept);
    },
    removeChild(child) {
      const i = self.children.indexOf(child);
      if (i >= 0) self.children.splice(i, 1);
      child.parent = null;
    },
    addEventListener(type, fn) { (self.attrs[`on:${type}`] as unknown) = fn as unknown as string; listeners.set(self, fn); },
    click() { listeners.get(self)?.(); },
    querySelector(sel) {
      const want = sel.replace(/^\./, "");
      return find(self, (n) => classesOf(n).includes(want)) ?? null;
    },
  };
  return self;
}

const listeners = new WeakMap<StubNode, () => void>();

/** Installs the stub globals. Call once, before importing anything that renders. */
export function installDom(): void {
  const g = globalThis as unknown as { document?: unknown };
  g.document = {
    createElement: (tag: string) => node(tag),
    createTextNode: (text: string) => {
      const n = node("#text");
      n.textContent = text;
      return n;
    },
  };
}

export function classesOf(n: StubNode): string[] {
  return n.className.split(/\s+/).filter(Boolean);
}

/** Depth-first, self included. */
export function walk(n: StubNode): StubNode[] {
  return [n, ...n.children.flatMap(walk)];
}

export function find(n: StubNode, pred: (n: StubNode) => boolean): StubNode | undefined {
  return walk(n).find(pred);
}

export function findAll(n: StubNode, pred: (n: StubNode) => boolean): StubNode[] {
  return walk(n).filter(pred);
}

export function hasClass(n: StubNode, cls: string): boolean {
  return classesOf(n).includes(cls);
}

/** Every word of text under this node, flattened. */
export function textOf(n: StubNode): string {
  return walk(n).map((x) => x.textContent).filter(Boolean).join(" ");
}

/** Whether `n` sits anywhere beneath an element carrying `cls`. */
export function isInside(n: StubNode, cls: string): boolean {
  for (let p = n.parent; p; p = p.parent) if (hasClass(p, cls)) return true;
  return false;
}

/** The first button whose text is exactly `label`. */
export function buttonNamed(root: StubNode, label: string): StubNode | undefined {
  return find(root, (n) => n.tagName === "button" && textOf(n).trim() === label);
}
