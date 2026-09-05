/**
 * A stopwatch for the board, off unless the page is opened with `?perf=1`.
 *
 * The engine has a bench script (`npm run bench`) for the parts that run in Node.
 * Drawing does not: the only honest way to know what a repaint costs is to measure
 * it in the browser that is doing it. This keeps the last few hundred samples per
 * label and reports the median and the p95, because a mean hides exactly the stutter
 * a player would notice.
 */

const ENABLED = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("perf") === "1";

const WINDOW = 240;
const samples = new Map<string, number[]>();

export function perfEnabled(): boolean {
  return ENABLED;
}

/** Times `fn` and returns whatever it returned. A no-op cost when the flag is off. */
export function measure<T>(label: string, fn: () => T): T {
  if (!ENABLED) return fn();
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const list = samples.get(label) ?? [];
    list.push(performance.now() - t0);
    if (list.length > WINDOW) list.shift();
    samples.set(label, list);
  }
}

function quantile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))]!;
}

/** One line per measured label, e.g. "board 1.8/3.1ms". Empty when the flag is off. */
export function perfReport(): string {
  if (!ENABLED) return "";
  const parts: string[] = [];
  for (const [label, list] of samples) {
    if (!list.length) continue;
    const sorted = [...list].sort((a, b) => a - b);
    parts.push(`${label} ${quantile(sorted, 0.5).toFixed(1)}/${quantile(sorted, 0.95).toFixed(1)}ms`);
  }
  return parts.length ? `${parts.join(" · ")}  (median/p95 over last ${WINDOW})` : "";
}
