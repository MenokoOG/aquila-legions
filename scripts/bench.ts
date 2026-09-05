import { performance } from "node:perf_hooks";
import { SCENARIO_BY_ID } from "../shared/data/scenarios.js";
import { createBattle, unitsOf } from "../client/src/engine/battle.js";
import { pathTo, reachable } from "../client/src/engine/rules.js";
import { threatMap } from "../client/src/engine/threat.js";
import { boardPixelSize, fromPixel, toPixel } from "../client/src/hex.js";

/**
 * Timings for the hot paths behind a mouse move. Sarmizegetusa is the worst board
 * the game ships: 14x10 hexes, 19 units, two enemy archers.
 *
 *   npm run bench
 *
 * Numbers are for comparing a change against the commit before it on the same
 * machine. They are not a claim about anyone else's hardware.
 */

const SC = SCENARIO_BY_ID.sarmizegetusa!;

const SAMPLES = 5;

/**
 * Median of several samples, not one run. A single pass swings by a third on a
 * machine doing anything else, which is wide enough to invent a speedup that
 * is not there or hide one that is.
 */
function time(label: string, iterations: number, fn: () => void): void {
  for (let i = 0; i < Math.min(iterations, 200); i++) fn(); // warm the JIT
  const runs: number[] = [];
  for (let sample = 0; sample < SAMPLES; sample++) {
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) fn();
    runs.push(((performance.now() - t0) / iterations) * 1000);
  }
  runs.sort((a, b) => a - b);
  const median = runs[Math.floor(SAMPLES / 2)]!;
  const spread = `${runs[0]!.toFixed(1)}-${runs[SAMPLES - 1]!.toFixed(1)}`;
  console.log(`${label.padEnd(34)} ${median.toFixed(1).padStart(7)} us/op   (median of ${SAMPLES}, range ${spread})`);
}

const s = createBattle(SC);
const board = boardPixelSize(SC.width, SC.height);

// A mouse moving across the board: points inside the drawn area, not hex centres.
const points: [number, number][] = [];
for (let i = 0; i < 1000; i++) {
  points.push([Math.random() * board.w, Math.random() * board.h]);
}

console.log(`\nboard ${SC.width}x${SC.height} = ${SC.width * SC.height} hexes, ${s.units.length} units\n`);

let p = 0;
time("fromPixel (one mouse move)", 20000, () => {
  const [x, y] = points[p++ % points.length]!;
  fromPixel(x, y, SC.width, SC.height);
});

const cohort = unitsOf(s, "player")[0]!;
time("reachable (one unit)", 20000, () => { reachable(s, cohort); });

const target = { q: 4, r: 4 };
time("pathTo (one hover)", 20000, () => { pathTo(s, cohort, target); });

time("threatMap (after every order)", 2000, () => { threatMap(s, "enemy"); });

// What the board actually costs per hover: highlights() runs reachable and pathTo,
// and the threat map is rebuilt once per order.
time("hover cost (reachable + pathTo)", 20000, () => {
  reachable(s, cohort);
  pathTo(s, cohort, target);
});

// Round-trip check, so a bench run also says whether the geometry still agrees.
let bad = 0;
for (let r = 0; r < SC.height; r++) {
  for (let q = 0; q < SC.width; q++) {
    const px = toPixel({ q, r });
    const back = fromPixel(px.x, px.y, SC.width, SC.height);
    if (!back || back.q !== q || back.r !== r) bad += 1;
  }
}
console.log(`\nhex centre round-trip: ${bad === 0 ? "all " + SC.width * SC.height + " agree" : bad + " MISMATCHES"}\n`);
