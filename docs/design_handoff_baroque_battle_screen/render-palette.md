# Board palette — edits to `client/src/render.ts`

The canvas does not read CSS, so the board colors live in `render.ts`. Replace the
constants below verbatim; everything else in the file stays as it is.

## 1. Terrain

```ts
// was: plain ["#c9b878","#a89a5c"], forest ["#4f6b3a","#324a24"], hill ["#a9865a","#7f6140"], rough ["#9a9a8c","#6f6f64"]
const TERRAIN_FILL: Record<Terrain, [string, string]> = {
  plain: ["#3A2A1E", "#211711"],
  forest: ["#0A5C15", "#032B08"],
  hill: ["#6B4227", "#3B2416"],
  rough: ["#3A3A38", "#1E1E1D"],
};
```

Hex outline, in `render()`: `ctx.strokeStyle = "rgba(218,165,32,0.16)"` (was `rgba(40,30,10,0.45)`),
`ctx.lineWidth = 1`. Terrain detail strokes/fills in `drawTerrainDetail` go lighter so they
read on the darker ground: forest `rgba(2,20,4,0.6)`, hill `rgba(239,203,99,0.28)`,
rough `rgba(255,255,240,0.14)`.

## 2. Floating combat numbers

```ts
const FLOAT_COLOR: Record<string, string> = {
  hit: "#EFCB63",      // damage dealt to the enemy — gold
  friendly: "#FF6A5E",  // damage taken — flame
  rout: "#FFFFF0",      // a unit breaking — ivory
};
```

Keep the dark outline behind them but deepen it: `ctx.strokeStyle = "rgba(6,4,3,0.9)"`.

## 3. Units — `drawUnit()`

```ts
ctx.fillStyle = own ? "#A81414" : "#4B0082";       // Rome crimson / Dacia royal purple
ctx.strokeStyle = own ? "#DAA520" : "#B48CE8";      // gold rim / lavender rim
ctx.lineWidth = 1.8;
```

- Selected glow: `ctx.shadowColor = "#DAA520"; ctx.shadowBlur = 22;`
- The core-cohort centre pip and the formation badge disc: `#EFCB63` with `#1A0F06` glyph.
- Glyph text: `#FFFFF0` for Rome, `#F0E4FF` for Dacia; font `bold 10px 'Cinzel Decorative', Georgia, serif`.
- Pila tick: `#EFCB63`.
- Strength bar under the counter: track `rgba(0,0,0,0.75)` with a `rgba(218,165,32,0.28)` hairline;
  fill `#E97451` above half, `#DAA520` above a third, `#A81414` below.
- Spent veil unchanged (`rgba(0,0,0,0.45)` acted, `0.2` moved).

## 4. Highlight rings — `ring()` calls in `render()`

```ts
if (hl.melee.has(k)) ring(ctx, x, y, "#FF6A5E");            // was #ff5a3c
if (hl.ranged.has(k)) ring(ctx, x, y, "#E97451");           // was #ffa03c
if (hl.pila.has(k)) ring(ctx, x, y, "#EFCB63", true);       // was #ffe45c
```

## 5. Reach overlay, hover, path

```ts
// reachable fill (was rgba(255,225,120,0.28))
ctx.fillStyle = "rgba(218,165,32,0.30)";
// plus a rim so gold hexes read on the dark ground:
ctx.strokeStyle = "rgba(239,203,99,0.75)"; ctx.lineWidth = 2; ctx.stroke();

// hover outline (was rgba(255,255,255,0.7))
ctx.strokeStyle = "#FFFFF0";

// route dots + destination in drawPath (was rgba(255,243,176,0.9))
ctx.strokeStyle = "#EFCB63";
ctx.fillStyle = "#EFCB63";
```

## 6. Threat patterns — `pattern()`

```ts
if (kind === "charge") {
  c.strokeStyle = "#A81414";   // was #8f1414
  c.lineWidth = 2.5;
  …
} else {
  c.fillStyle = "#8A5CD6";     // was #7a2c6a — royal purple, lightened to read on dark
  …
}
```

In `drawThreat`, raise the charge alpha slightly for the dark ground:
`ctx.globalAlpha = 0.28 + weight * 0.1` (missile stays `0.55`).
