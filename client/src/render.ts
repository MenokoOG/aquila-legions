import type { Hex, Terrain } from "../../shared/types.js";
import { HEX_SIZE, boardPixelSize, corners, key, toPixel } from "./hex.js";
import type { BattleState, BattleUnit } from "./engine/battle.js";
import { terrainAt } from "./engine/battle.js";
import { type ThreatMap, threatAt } from "./engine/threat.js";
import type { Effects } from "./effects.js";

/** Canvas renderer. Reads state, draws it, owns nothing. */

export interface Highlights {
  selected: BattleUnit | null;
  reachable: Set<string>;
  melee: Set<string>;
  ranged: Set<string>;
  pila: Set<string>;
  hover: Hex | null;
  /** The route the selected unit would walk to the hovered hex, first step first. */
  path: Hex[];
  /** Where the Dacians could strike next turn. Null when the player has the layer off. */
  threat: ThreatMap | null;
}

const TERRAIN_FILL: Record<Terrain, [string, string]> = {
  plain: ["#3A2A1E", "#211711"],
  forest: ["#0A5C15", "#032B08"],
  hill: ["#6B4227", "#3B2416"],
  rough: ["#3A3A38", "#1E1E1D"],
};

const FORM_BADGE: Record<string, string> = { line: "", testudo: "T", cuneus: "W", orbis: "O" };

const FLOAT_COLOR: Record<string, string> = {
  hit: "#EFCB63", friendly: "#FF6A5E", rout: "#FFFFF0",
};

export function sizeCanvas(canvas: HTMLCanvasElement, width: number, height: number): void {
  const { w, h } = boardPixelSize(width, height);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.getContext("2d")?.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, size = HEX_SIZE): void {
  const pts = corners(cx, cy, size);
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

function drawTerrainDetail(ctx: CanvasRenderingContext2D, t: Terrain, cx: number, cy: number, seed: number): void {
  ctx.save();
  if (t === "forest") {
    ctx.fillStyle = "rgba(2,20,4,0.6)";
    for (let i = 0; i < 5; i++) {
      const a = (seed * 7 + i * 73) % 360;
      const rad = 6 + ((seed * 13 + i * 31) % 14);
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); ctx.fill();
    }
  } else if (t === "hill") {
    ctx.strokeStyle = "rgba(239,203,99,0.28)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6 - i * 5, 18 - i * 5, 7 - i * 2, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
  } else if (t === "rough") {
    ctx.fillStyle = "rgba(255,255,240,0.14)";
    for (let i = 0; i < 6; i++) {
      const a = (seed * 11 + i * 61) % 360;
      const rad = 4 + ((seed * 5 + i * 17) % 16);
      ctx.beginPath();
      ctx.ellipse(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad, 3.5, 2.2, a, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
  ctx.restore();
}

/**
 * Two hatch tiles, built once and cached. Diagonal bars mean a charge can reach the
 * hex; dots mean arrows can. They are patterns rather than a flat wash so the terrain
 * underneath stays readable and the gold move overlay still reads on top.
 */
const TILE = 10;
let chargeTile: CanvasPattern | null = null;
let arrowTile: CanvasPattern | null = null;

function pattern(ctx: CanvasRenderingContext2D, kind: "charge" | "arrow"): CanvasPattern | null {
  const cached = kind === "charge" ? chargeTile : arrowTile;
  if (cached) return cached;
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const c = tile.getContext("2d");
  if (!c) return null;
  if (kind === "charge") {
    c.strokeStyle = "#A81414";
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-TILE, TILE); c.lineTo(TILE, -TILE);
    c.moveTo(0, TILE * 2); c.lineTo(TILE * 2, 0);
    c.stroke();
  } else {
    c.fillStyle = "#8A5CD6";
    c.beginPath(); c.arc(TILE / 2, TILE / 2, 1.7, 0, Math.PI * 2); c.fill();
  }
  const made = ctx.createPattern(tile, "repeat");
  if (kind === "charge") chargeTile = made; else arrowTile = made;
  return made;
}

/** Shades a hex the enemy can reach. More attackers bearing on it, heavier the shade. */
function drawThreat(ctx: CanvasRenderingContext2D, hx: Hex, cx: number, cy: number, map: ThreatMap): void {
  const cell = threatAt(map, hx);
  if (!cell) return;
  const weight = Math.min(3, cell.melee.length + cell.missile.length);
  ctx.save();
  if (cell.melee.length) {
    const p = pattern(ctx, "charge");
    if (p) {
      ctx.globalAlpha = 0.28 + weight * 0.1;
      hexPath(ctx, cx, cy, HEX_SIZE - 2);
      ctx.fillStyle = p;
      ctx.fill();
    }
  }
  if (cell.missile.length) {
    const p = pattern(ctx, "arrow");
    if (p) {
      ctx.globalAlpha = 0.55;
      hexPath(ctx, cx, cy, HEX_SIZE - 2);
      ctx.fillStyle = p;
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawUnit(ctx: CanvasRenderingContext2D, u: BattleUnit, cx: number, cy: number, selected: boolean): void {
  const own = u.side === "player";
  const w = 30;
  const h = 34;
  ctx.save();
  if (selected) {
    ctx.shadowColor = "#DAA520";
    ctx.shadowBlur = 22;
  }
  ctx.fillStyle = own ? "#A81414" : "#4B0082";
  ctx.strokeStyle = own ? "#DAA520" : "#B48CE8";
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  if (own && u.tmpl.core) {
    const r = 5;
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  } else if (u.tmpl.mounted) {
    ctx.moveTo(cx, cy - h / 2);
    ctx.lineTo(cx + w / 2, cy + h / 2 - 4);
    ctx.lineTo(cx - w / 2, cy + h / 2 - 4);
    ctx.closePath();
  } else {
    ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (own) {
    ctx.fillStyle = "#EFCB63";
    ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = own ? "#FFFFF0" : "#F0E4FF";
  ctx.font = "bold 10px 'Cinzel Decorative', Georgia, serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(u.tmpl.glyph, cx, cy - 7);

  if (u.pila > 0) {
    ctx.strokeStyle = "#EFCB63";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy + 11); ctx.lineTo(cx + 8, cy + 3); ctx.stroke();
  }

  const badge = FORM_BADGE[u.formation] ?? "";
  if (badge) {
    ctx.fillStyle = "#EFCB63";
    ctx.beginPath(); ctx.arc(cx + 14, cy - 15, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#1A0F06";
    ctx.font = "bold 9px 'Cinzel Decorative', Georgia, serif";
    ctx.fillText(badge, cx + 14, cy - 15);
  }

  const frac = u.men / u.maxMen;
  const barW = 32;
  ctx.fillStyle = "rgba(0,0,0,0.75)";
  ctx.fillRect(cx - barW / 2, cy + h / 2 + 2, barW, 5);
  ctx.strokeStyle = "rgba(218,165,32,0.28)";
  ctx.lineWidth = 1;
  ctx.strokeRect(cx - barW / 2, cy + h / 2 + 2, barW, 5);
  ctx.fillStyle = frac > 0.5 ? "#E97451" : frac > 0.33 ? "#DAA520" : "#A81414";
  ctx.fillRect(cx - barW / 2, cy + h / 2 + 2, barW * frac, 5);

  // Two shades of spent: dark once the unit has attacked and is finished, lighter
  // when it has only moved and could still fight. The eye can then find whoever is
  // still waiting on orders.
  const veil = u.acted ? 0.45 : u.moved ? 0.2 : 0;
  if (veil > 0) {
    ctx.fillStyle = `rgba(0,0,0,${veil})`;
    ctx.beginPath(); ctx.ellipse(cx, cy, w / 2 + 1, h / 2 + 1, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, dashed = false): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  if (dashed) ctx.setLineDash([6, 4]);
  hexPath(ctx, cx, cy, HEX_SIZE - 4);
  ctx.stroke();
  ctx.restore();
}

/** The dotted route to the hovered hex, with the destination marked. */
function drawPath(ctx: CanvasRenderingContext2D, from: Hex, path: Hex[]): void {
  if (!path.length) return;
  ctx.save();
  ctx.strokeStyle = "#EFCB63";
  ctx.lineWidth = 3;
  ctx.setLineDash([5, 6]);
  ctx.lineCap = "round";
  ctx.beginPath();
  const start = toPixel(from);
  ctx.moveTo(start.x, start.y);
  for (const step of path) {
    const p = toPixel(step);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const end = toPixel(path[path.length - 1]!);
  ctx.fillStyle = "#EFCB63";
  ctx.beginPath(); ctx.arc(end.x, end.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, fx: Effects): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 17px 'Cinzel Decorative', Georgia, serif";
  for (const { f, age } of fx.alive()) {
    const { x, y } = toPixel(f.at);
    const rise = 6 + age * 30;
    ctx.globalAlpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(6,4,3,0.9)";
    ctx.strokeText(f.text, x, y - 26 - rise);
    ctx.fillStyle = FLOAT_COLOR[f.tone] ?? "#fff";
    ctx.fillText(f.text, x, y - 26 - rise);
  }
  ctx.restore();
}

/**
 * The ground, drawn once per battle instead of once per frame.
 *
 * Terrain does not change while a battle runs, but it was being rebuilt on every
 * mouse move: a radial gradient constructed per hex, a hex path stroked, and a
 * procedural scatter of trees, contours or boulders on top. That is the most
 * expensive thing on the board and the only part of it that never moves. Now it is
 * painted into an offscreen canvas and blitted.
 *
 * Keyed on the scenario and the device pixel ratio, so dragging the window to a
 * monitor with different scaling repaints it rather than blowing up a stale bitmap.
 */
interface TerrainLayer {
  canvas: HTMLCanvasElement;
  dpr: number;
}

const TERRAIN_LAYERS = new WeakMap<BattleState["scenario"], TerrainLayer>();

function terrainLayer(s: BattleState, dpr: number): HTMLCanvasElement {
  const cached = TERRAIN_LAYERS.get(s.scenario);
  if (cached && cached.dpr === dpr) return cached.canvas;

  const { width, height } = s.scenario;
  const { w, h } = boardPixelSize(width, height);
  const layer = document.createElement("canvas");
  layer.width = Math.round(w * dpr);
  layer.height = Math.round(h * dpr);
  const lc = layer.getContext("2d");
  if (lc) {
    lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (let r = 0; r < height; r++) {
      for (let q = 0; q < width; q++) {
        const hx = { q, r };
        const { x, y } = toPixel(hx);
        const t = terrainAt(s, hx);
        const [c1, c2] = TERRAIN_FILL[t];
        const g = lc.createRadialGradient(x - 8, y - 10, 4, x, y, HEX_SIZE);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        hexPath(lc, x, y);
        lc.fillStyle = g;
        lc.fill();
        lc.strokeStyle = "rgba(218,165,32,0.16)";
        lc.lineWidth = 1;
        lc.stroke();
        drawTerrainDetail(lc, t, x, y, q * 31 + r * 17);
      }
    }
  }
  TERRAIN_LAYERS.set(s.scenario, { canvas: layer, dpr });
  return layer;
}

export function render(canvas: HTMLCanvasElement, s: BattleState, hl: Highlights, fx?: Effects): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = s.scenario;
  const { w, h } = boardPixelSize(width, height);
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(terrainLayer(s, window.devicePixelRatio || 1), 0, 0, w, h);

  // What is left of the per-hex pass is only what actually changes: the enemy's
  // reach, this unit's moves, and the hex under the cursor. Hexes with none of
  // those cost nothing.
  const hoverKey = hl.hover ? key(hl.hover) : null;
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const hx = { q, r };
      const k = key(hx);
      const reach = hl.reachable.has(k);
      const isHover = hoverKey === k;
      const threatened = hl.threat ? hl.threat.has(k) : false;
      if (!reach && !isHover && !threatened) continue;

      const { x, y } = toPixel(hx);
      if (threatened && hl.threat) drawThreat(ctx, hx, x, y, hl.threat);
      if (reach) {
        hexPath(ctx, x, y, HEX_SIZE - 2);
        ctx.fillStyle = "rgba(218,165,32,0.30)";
        ctx.fill();
        ctx.strokeStyle = "rgba(239,203,99,0.75)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      if (isHover) {
        hexPath(ctx, x, y, HEX_SIZE - 1);
        ctx.strokeStyle = "#FFFFF0";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  if (hl.selected) drawPath(ctx, hl.selected.at, hl.path);

  for (const u of s.units) {
    const { x, y } = toPixel(u.at);
    const k = key(u.at);
    if (hl.melee.has(k)) ring(ctx, x, y, "#FF6A5E");
    if (hl.ranged.has(k)) ring(ctx, x, y, "#E97451");
    if (hl.pila.has(k)) ring(ctx, x, y, "#EFCB63", true);
    drawUnit(ctx, u, x, y, hl.selected?.id === u.id);
  }

  if (fx) drawFloaters(ctx, fx);
}
