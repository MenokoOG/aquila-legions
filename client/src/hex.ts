import type { Hex } from "../../shared/types.js";

/** Pointy-top hexes in odd-r offset coordinates: q = column, r = row. */

export const HEX_SIZE = 36;
const SQRT3 = Math.sqrt(3);

export function key(h: Hex): string {
  return `${h.q},${h.r}`;
}

export function same(a: Hex, b: Hex): boolean {
  return a.q === b.q && a.r === b.r;
}

interface Cube { x: number; y: number; z: number }

function toCube(h: Hex): Cube {
  const x = h.q - (h.r - (h.r & 1)) / 2;
  const z = h.r;
  return { x, y: -x - z, z };
}

function fromCube(c: Cube): Hex {
  return { q: c.x + (c.z - (c.z & 1)) / 2, r: c.z };
}

export function distance(a: Hex, b: Hex): number {
  const ca = toCube(a);
  const cb = toCube(b);
  return Math.max(Math.abs(ca.x - cb.x), Math.abs(ca.y - cb.y), Math.abs(ca.z - cb.z));
}

const CUBE_DIRS: Cube[] = [
  { x: 1, y: -1, z: 0 }, { x: 1, y: 0, z: -1 }, { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 }, { x: -1, y: 0, z: 1 }, { x: 0, y: -1, z: 1 },
];

export function neighbors(h: Hex, width: number, height: number): Hex[] {
  const c = toCube(h);
  const out: Hex[] = [];
  for (const d of CUBE_DIRS) {
    const n = fromCube({ x: c.x + d.x, y: c.y + d.y, z: c.z + d.z });
    if (n.q >= 0 && n.q < width && n.r >= 0 && n.r < height) out.push(n);
  }
  return out;
}

export function toPixel(h: Hex, size = HEX_SIZE): { x: number; y: number } {
  const x = size * SQRT3 * (h.q + 0.5 * (h.r & 1)) + size;
  const y = size * 1.5 * h.r + size;
  return { x, y };
}

export function fromPixel(px: number, py: number, width: number, height: number, size = HEX_SIZE): Hex | null {
  let best: Hex | null = null;
  let bestD = Infinity;
  for (let r = 0; r < height; r++) {
    for (let q = 0; q < width; q++) {
      const p = toPixel({ q, r }, size);
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) { bestD = d; best = { q, r }; }
    }
  }
  return best && bestD <= (size * 0.95) ** 2 ? best : null;
}

export function boardPixelSize(width: number, height: number, size = HEX_SIZE): { w: number; h: number } {
  return {
    w: Math.ceil(size * SQRT3 * (width + 0.5) + size),
    h: Math.ceil(size * 1.5 * (height - 1) + size * 3),
  };
}

export function corners(cx: number, cy: number, size = HEX_SIZE): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    out.push([cx + size * Math.cos(angle), cy + size * Math.sin(angle)]);
  }
  return out;
}
