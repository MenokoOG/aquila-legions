import type { Hex, Terrain } from "../../shared/types.js";
import { HEX_SIZE, boardPixelSize, corners, key, toPixel } from "./hex.js";
import type { BattleState, BattleUnit } from "./engine/battle.js";
import { terrainAt } from "./engine/battle.js";

/** Canvas renderer. Reads state, draws it, owns nothing. */

export interface Highlights {
  selected: BattleUnit | null;
  reachable: Set<string>;
  melee: Set<string>;
  ranged: Set<string>;
  pila: Set<string>;
  hover: Hex | null;
}

const TERRAIN_FILL: Record<Terrain, [string, string]> = {
  plain: ["#c9b878", "#a89a5c"],
  forest: ["#4f6b3a", "#324a24"],
  hill: ["#a9865a", "#7f6140"],
  rough: ["#9a9a8c", "#6f6f64"],
};

const GLYPH: Record<string, string> = {
  cohort: "COH", first_cohort: "I", aux_infantry: "AUX", aux_archers: "SAG", ala_cavalry: "ALA",
  scorpio: "SCP", warband: "WAR", falxmen: "FLX", dacian_archers: "ARC", cataphracts: "CAT",
};

const FORM_BADGE: Record<string, string> = { line: "", testudo: "T", cuneus: "W", orbis: "O" };

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

function drawUnit(ctx: CanvasRenderingContext2D, u: BattleUnit, cx: number, cy: number, selected: boolean): void {
  const rome = u.side === "rome";
  const w = 30;
  const h = 34;
  ctx.save();
  if (selected) {
    ctx.shadowColor = "#fff3b0";
    ctx.shadowBlur = 18;
  }
  ctx.fillStyle = rome ? "#9b1c1c" : "#2f4b6e";
  ctx.strokeStyle = rome ? "#e8c65a" : "#c7d3e0";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (rome && (u.kind === "cohort" || u.kind === "first_cohort")) {
    const r = 5;
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, r);
  } else if (u.kind === "ala_cavalry" || u.kind === "cataphracts") {
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

  if (rome) {
    ctx.fillStyle = "#e8c65a";
    ctx.beginPath(); ctx.arc(cx, cy, 3.2, 0, Math.PI * 2); ctx.fill();
  }

  ctx.fillStyle = "#fff8e6";
  ctx.font = "bold 10px 'Cinzel', 'Georgia', serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(GLYPH[u.kind] ?? "?", cx, cy - 7);

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

  if (u.acted || (u.moved && u.side === "rome")) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
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

export function render(canvas: HTMLCanvasElement, s: BattleState, hl: Highlights): void {
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

  for (const u of s.units) {
    const { x, y } = toPixel(u.at);
    const k = key(u.at);
    if (hl.melee.has(k)) ring(ctx, x, y, "#ff5a3c");
    if (hl.ranged.has(k)) ring(ctx, x, y, "#ffa03c");
    if (hl.pila.has(k)) ring(ctx, x, y, "#ffe45c", true);
    drawUnit(ctx, u, x, y, hl.selected?.id === u.id);
  }
}
