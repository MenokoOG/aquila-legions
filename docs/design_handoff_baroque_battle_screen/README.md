# Handoff: Aquila battle screen — Baroque skin

## Overview

A visual redesign of the battle screen in **Aquila: Legions of Trajan** (a local
single-player hex-tactics game about the Dacian Wars). The game's structure, rules and
markup are unchanged; what changes is the skin — from a light parchment sheet to a dark
Baroque one: midnight ground, theatrical radial lighting, deep crimson and royal gold,
royal purple for the Dacians, emerald for objectives met. The battle screen was designed
in full; the menu, codex and modals are covered by the same stylesheet so nothing in the
app is left unstyled.

The redesign also **re-ordered the battle HUD**: the left panel is now the acting panel
(selected unit → formation → strike mode → forecast → end turn), and objectives, the
threat readout and the dispatch log moved to the right column. The existing
`renderLeftPanel` / `renderLog` functions already produce this content; only which
column each block is appended to needs to change if you want the new order.

## About the design files

`Aquila Battle Screen v2 Baroque.dc.html` in this bundle is a **design reference built
in HTML** — a prototype showing intended look, colour and behaviour. It is not production
code to lift. The board in it is HTML/CSS hexes; the real game draws the board on a
`<canvas>` in `client/src/render.ts`.

The implementation task is therefore:

1. Drop in `styles.css` (a complete replacement for `client/src/styles.css`).
2. Apply `render-palette.md` to `client/src/render.ts` so the canvas matches the chrome.
3. Apply `index-html-fonts.md` to `client/index.html`.
4. Optionally move the objectives/log blocks per "Screens" below.

No new dependencies. No build changes. TypeScript is untouched except for the colour
constants in `render.ts` and (optionally) two `root.append` targets in the HUD.

## Fidelity

**High fidelity.** Colours, type, spacing, radii and states are final and exact. Match
them. The one deliberate deviation from the source design brief: the brief names *Cinzel
Decorative* for body text; at 13–16px in a dense HUD it is unreadable, so body copy uses
**Cinzel**, all numerals use **JetBrains Mono**, and Cinzel Decorative is reserved for
display headings, the primary button and unit glyphs.

## Screens / views

### Battle screen — `client/src/ui/battleScreen.ts`, `hud.ts`, `boardBar.ts`

Purpose: give one order at a time to a Roman cohort, read what it will cost, and end the turn.

Layout: `.battle` is a three-column grid, `minmax(0,344px) minmax(0,1fr) minmax(0,330px)`,
`gap: 1.5rem`, `align-items: start`; collapses to one column under 1100px. Page container
`#screen` is `max-width: 1280px`, centred, `padding: 1.5rem 1.5rem 4rem`.

**Header (`#topbar`)** — full-bleed bar, `padding: 0.9rem 1.5rem`, background
`linear-gradient(180deg,#1B0F0E,#120C0B)`, `border-bottom: 1px solid rgba(218,165,32,0.30)`,
shadow `0 18px 44px rgba(0,0,0,0.55)` plus `inset 0 1px 0 rgba(218,165,32,0.18)`, and a
gold hairline flourish via `::after` — a `1px` `linear-gradient(90deg,transparent,#DAA520,transparent)`
inset `1.5rem` from each edge. Brand mark "AQVILA" in Cinzel Decorative 700, 1.2rem,
`letter-spacing: 0.14em`, `#EFCB63`. Right side: pills in JetBrains Mono 0.72rem, gold on
`rgba(218,165,32,0.07)`, `border-radius: 8px`.

**Left column (`.panel.left`)**, in order:
- Selected/hovered unit card (`.unit-card`): 3px left border — crimson `#A81414` for Rome,
  lavender `#B48CE8` for Dacia. Name in Cinzel Decorative 1.1rem `#FFFFF0`; `.latin` italic muted.
- Strength (`.unit-men` + `.bar`): 10px track `#0B0807` with a gold hairline, fill
  `linear-gradient(90deg,#6E1A02,#E97451)` and a `0 0 14px rgba(233,116,81,0.45)` glow.
- Stat readouts (`.unit-stats`): JetBrains Mono 0.68rem, `rgba(247,231,206,0.78)`.
- Formation row (`.form-row` of `.btn.form`): four equal buttons, `border-radius: 8px`;
  active state `linear-gradient(180deg,#DAA520,#9A6F0C)` with `#1A0F06` text.
- Strike mode (Gladius / Pila): same buttons; active is
  `linear-gradient(180deg,#A81414,#6E0000)` with ivory text.
- Forecast (`.forecast`): gold-ruled panel; each row is a boxed
  `label / .fc-num` pair on `rgba(13,13,13,0.55)`. `.forecast.risky` switches to
  `linear-gradient(180deg,rgba(139,0,0,0.42),rgba(31,8,8,0.72))` with a
  `rgba(168,20,20,0.85)` border, and `.fc-note.warn` is `#F0A08C`.
- End turn (`.btn.primary`): full width, `padding: 0.85rem 1rem`, Cinzel Decorative 0.9rem,
  `linear-gradient(180deg,#A81414,#6E0000)`, 1px `#DAA520` border, shadow
  `0 8px 22px rgba(139,0,0,0.5)` + `inset 0 1px 0 rgba(255,255,240,0.14)`; presses down 1px.
- Keys line (`.end-row .keys`): JetBrains Mono 0.64rem above a `rgba(218,165,32,0.14)` rule.

**Centre column** — `.board-wrap` holds the canvas and `.board-bar`. Wrap background
`radial-gradient(700px 380px at 50% 0%, #2A1C14, #120C0A 70%)`, 1px gold border, 8px radius,
`padding: 1.1rem`, shadow `0 24px 60px rgba(0,0,0,0.62)` + `inset 0 0 90px rgba(0,0,0,0.7)`.
`.board-bar` is the enemy-reach toggle plus the colour key: 15px `.swatch` chips at 4px radius,
labels uppercase 0.68rem `letter-spacing: 0.06em`.

**Right column (`.panel.right`)**, in order: objectives, the threat readout, dispatches.
- `.objective` rows are boxed: 8px radius, `#1E1512`, 3px left border. Met rows go emerald
  (`linear-gradient(180deg,rgba(4,99,7,0.22),rgba(4,99,7,0.06))`, left border `#046307`, the
  `✓` mark on a solid emerald chip). Failed rows take a crimson left border and strike the text.
  Points in JetBrains Mono gold, right-aligned via `order: 3`.
- `.danger` is the one purple panel: `rgba(75,0,130,0.3)` over `rgba(29,10,44,0.55)`, 1px
  `rgba(75,0,130,0.6)`.
- `.log-line` rows: 8px radius, 2px left border — crimson for Rome, `#7A3FB0` for Dacia,
  gold for system lines (italic, muted). `.log-turn` in mono gold 0.62rem.

### Menu, codex, modals

Same stylesheet, same class names as today. Cards are
`linear-gradient(180deg,#17100E,#120C0B)` with a 1px gold rule, an 8px radius and a
3px left border that turns emerald once a scenario is complete. The result modal
(`.modal-card`) enters with fade + 16px translate-Y over 420ms ease-out; `.points-big` is
JetBrains Mono 700 at 2.2rem in `#EFCB63`.

## Interactions & behaviour

Unchanged from the current build — the redesign adds no new behaviour. Transitions:
buttons 200ms ease-out on background/shadow/transform; primary press `translateY(1px)`;
modal entry 420ms ease-out fade + translate-Y. Only `transform`, `opacity`, `background`
and `box-shadow` animate. Focus is a 2px `#DAA520` ring at 2px offset everywhere; the
browser default is never used.

## State management

No changes. `BattleState` in `client/src/engine/battle.ts` and the view flags in
`HudView` (`selected`, `hover`, `forecast`, `danger`, `mode`, `busy`, `canUndo`) already
drive every state the design shows: selected vs. hovered unit card, `.forecast.risky`,
the four formation buttons, gladius/pila mode, the enemy-reach toggle, and the
done/failed/pending objective rows.

## Design tokens

Colour — declared as CSS variables at the top of `styles.css`:

| Token | Hex | Use |
| --- | --- | --- |
| `--ink` | `#0D0D0D` | page ground |
| `--panel` / `--panel-2` | `#17100E` / `#1E1512` | panels / inset boxes |
| `--crimson` / `--crimson-lit` | `#8B0000` / `#A81414` | Rome, primary action |
| `--gold` / `--gold-lit` | `#DAA520` / `#EFCB63` | rules, labels, highlights |
| `--ivory` / `--champagne` | `#FFFFF0` / `#F7E7CE` | headings / body text |
| `--purple` / `--purple-lit` | `#4B0082` / `#8A5CD6` | Dacia, bow reach |
| `--emerald` | `#046307` | objective met |
| `--sienna` / `--flame` | `#E97451` / `#FF6A5E` | strength bar, ranged / melee ring |
| `--rule` / `--rule-soft` | `rgba(218,165,32,0.30)` / `0.14` | ornamental hairlines |

Muted text is `rgba(247,231,206,0.78)` — do not go lighter than that on panels; below it the
small mono labels fall under 4.5:1.

Type — Cinzel Decorative 700 (display), Cinzel 400/600 (body, UI labels),
JetBrains Mono 400/700 (every number). Scale: h1 2.25rem, h2 1.5rem, body 1rem/1.6,
small 0.82rem, mono labels 0.62–0.76rem with 0.04–0.16em tracking.

Spacing — 0.4 / 0.6 / 0.9 / 1.2 / 1.5rem rhythm; section gaps 1.5rem.
Radius — 8px everywhere (4px only for the 15px legend swatches).
Shadow — `0 14px 38px rgba(0,0,0,0.5)` (panels), `0 24px 60px rgba(0,0,0,0.62)` (board),
`0 30px 80px rgba(0,0,0,0.7)` (modal).

## Assets

None. No images, no icon files — the ornament is CSS gradients and hairlines. Fonts come
from Google Fonts (Cinzel Decorative, Cinzel, JetBrains Mono). If icons are wanted later,
the brief specifies Lucide.

## Files

In this bundle:

- `styles.css` — drop-in replacement for `client/src/styles.css`.
- `render-palette.md` — the exact constant replacements for `client/src/render.ts`.
- `index-html-fonts.md` — the font links for `client/index.html`.
- `Aquila Battle Screen v2 Baroque.dc.html` — the HTML design reference (open in a browser).

In the game repo, for context: `client/src/ui/hud.ts` (left/right panel markup),
`client/src/ui/boardBar.ts` (legend), `client/src/ui/modal.ts`, `client/src/render.ts` (canvas).
