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
  plain: ["#c9b878", "#a89a5c"],
  forest: ["#4f6b3a", "#324a24"],
  hill: ["#a9865a", "#7f6140"],
  rough: ["#9a9a8c", "#6f6f64"],
};

const FORM_BADGE: Record<string, string> = { line: "", testudo: "T", cuneus: "W", orbis: "O" };

const FLOAT_COLOR: Record<string, string> = {
  hit: "#ffd9a0", friendly: "#ff9a86", rout: "#fff3b0",
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
    ctx.fillStyle = "rgba(20,40,15,0.55)";
    for (let i = 0; i < 5; i++) {
      const a = (seed * 7 + i * 73) % 360;
      const rad = 6 + ((seed * 13 + i * 31) % 14);
      const x = cx + Math.cos(a) * rad;
      const y = cy + Math.sin(a) * rad;
      ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.lineTo(x + 5, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); ctx.fill();
    }
  } else if (t === "hill") {
    ctx.strokeStyle = "rgba(70,45,20,0.45)";
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy + 6 - i * 5, 18 - i * 5, 7 - i * 2, 0, Math.PI, 2 * Math.PI);
      ctx.stroke();
    }
  } else if (t === "rough") {
    ctx.fillStyle = "rgba(50,50,45,0.5)";
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
    c.strokeStyle = "#8f1414";
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-TILE, TILE); c.lineTo(TILE, -TILE);
    c.moveTo(0, TILE * 2); c.lineTo(TILE * 2, 0);
    c.stroke();
  } else {
    c.fillStyle = "#7a2c6a";
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
      ctx.globalAlpha = 0.2 + weight * 0.09;
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
    ctx.shadowColor = "#fff3b0";
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = own ? "#9b1c1c" : "#2f4b6e";
  ctx.strokeStyle = own ? "#e8c65a" : "#c7d3e0";
  ctx.lineWidth = 2.2;
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
    ctx.fillStyle = "#e8c65a";
    ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = "#fff8e6";
  ctx.font = "bold 10px 'Cinzel', 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(u.tmpl.glyph, cx, cy - 7);

  if (u.pila > 0) {
    ctx.strokeStyle = "#fff8e6";
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(cx - 8, cy + 11); ctx.lineTo(cx + 8, cy + 3); ctx.stroke();
  }

  const badge = FORM_BADGE[u.formation] ?? "";
  if (badge) {
    ctx.fillStyle = "#e8c65a";
    ctx.beginPath(); ctx.arc(cx + 14, cy - 15, 7.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#2a1a0a";
    ctx.font = "bold 9px 'Cinzel', serif";
    ctx.fillText(badge, cx + 14, cy - 15);
  }

  const frac = u.men / u.maxMen;
  const barW = 32;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(cx - barW / 2, cy + h / 2 + 2, barW, 5);
  ctx.fillStyle = frac > 0.5 ? "#7ccf6a" : frac > 0.3 ? "#e6c04a" : "#e0563b";
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
  ctx.strokeStyle = "rgba(255,243,176,0.9)";
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
  ctx.fillStyle = "rgba(255,243,176,0.9)";
  ctx.beginPath(); ctx.arc(end.x, end.y, 5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawFloaters(ctx: CanvasRenderingContext2D, fx: Effects): void {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 17px 'Cinzel', Georgia, serif";
  for (const { f, age } of fx.alive()) {
    const { x, y } = toPixel(f.at);
    const rise = 6 + age * 30;
    ctx.globalAlpha = age < 0.7 ? 1 : 1 - (age - 0.7) / 0.3;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(20,12,4,0.85)";
    ctx.strokeText(f.text, x, y - 26 - rise);
    ctx.fillStyle = FLOAT_COLOR[f.tone] ?? "#fff";
    ctx.fillText(f.text, x, y - 26 - rise);
  }
  ctx.restore();
}

export function render(canvas: HTMLCanvasElement, s: BattleState, hl: Highlights, fx?: Effects): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = s.scenario;
  const { w, h } = boardPixelSize(width, height);
  ctx.clearRect(0, 0, w, h);

  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const hx = { q, r };
      const { x, y } = toPixel(hx);
      const t = terrainAt(s, hx);
      const [c1, c2] = TERRAIN_FILL[t];
      const g = ctx.createRadialGradient(x - 8, y - 10, 4, x, y, HEX_SIZE);
      g.addColorStop(0, c1);
      g.addColorStop(1, c2);
      hexPath(ctx, x, y);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "rgba(40,30,10,0.45)";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      drawTerrainDetail(ctx, t, x, y, q * 31 + r * 17);
      if (hl.threat) drawThreat(ctx, hx, x, y, hl.threat);

      const k = key(hx);
      if (hl.reachable.has(k)) {
        hexPath(ctx, x, y, HEX_SIZE - 2);
        ctx.fillStyle = "rgba(255,225,120,0.28)";
        ctx.fill();
      }
      if (hl.hover && hl.hover.q === q && hl.hover.r === r) {
        hexPath(ctx, x, y, HEX_SIZE - 1);
        ctx.strokeStyle = "rgba(255,255,255,0.7)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  if (hl.selected) drawPath(ctx, hl.selected.at, hl.path);

  for (const u of s.units) {
    const { x, y } = toPixel(u.at);
    const k = key(u.at);
    if (hl.melee.has(k)) ring(ctx, x, y, "#ff5a3c");
    if (hl.ranged.has(k)) ring(ctx, x, y, "#ffa03c");
    if (hl.pila.has(k)) ring(ctx, x, y, "#ffe45c", true);
    drawUnit(ctx, u, x, y, hl.selected?.id === u.id);
  }

  if (fx) drawFloaters(ctx, fx);
}
