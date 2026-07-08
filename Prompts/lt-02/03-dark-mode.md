# 03 — Dark mode

Proper dark-mode support. The Tab S8 runs a system dark theme, and the app
currently only has the warm light palette, so it looks out of place at night.

## Goal & scope

- Respect the **system** colour scheme by default (`prefers-color-scheme`).
- Provide an **optional manual override** (system / light / dark) in the parent
  settings, persisted.
- Theme **both the DOM and the canvas** — the tracing surface must recolour too.
- Keep contrast kid-friendly in both themes.

## Current gaps

- `src/style.css` defines a **light-only** palette in `:root` (`--bg #fdf6e3`,
  `--ink`, `--accent`, `--panel`, `--line`, …). No dark branch.
- `src/render/glyph-renderer.ts` has a **hardcoded `COLORS`** object (bg, road,
  guide, current, ink, inkCurrent, start) used by canvas drawing — it won't
  follow CSS. This is the crux: canvas colours must become theme-aware.
- `index.html` has a single fixed `<meta name="theme-color" content="#fdf6e3">`.
- The web manifest has fixed `theme_color`/`background_color` (light).

## Approach

Mirror the standard pattern (same as the artifact-design guidance): **system by
default via media query, with a `data-theme` attribute override that wins in
both directions.**

### 1. CSS tokens (`src/style.css`)

Define every colour as a token, with light defaults and a dark set:

```css
:root {
  --bg: #fdf6e3; --panel: #fffaf0; --ink: #3a3226; --muted: #8a7f6a;
  --accent: #e2683c; --accent-2: #6c9bd1; --line: rgba(0,0,0,.10);
  /* canvas tokens (new — read by the renderer): */
  --road: #e7dcc4; --guide: #c9bda0; --current: #6c9bd1;
  --trace-ink: #2f6b3f; --trace-ink-active: #3f8f52; --start: #e2683c;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #1c1a17; --panel: #262320; --ink: #ece4d4; --muted: #a89c86;
    --accent: #f0895f; --accent-2: #8fb6e0; --line: rgba(255,255,255,.14);
    --road: #3a352c; --guide: #554d3f; --current: #8fb6e0;
    --trace-ink: #7fd39a; --trace-ink-active: #a6e6ba; --start: #f0895f;
  }
}
/* Manual override wins over the media query, both ways: */
:root[data-theme='light'] { /* repeat the light values */ }
:root[data-theme='dark']  { /* repeat the dark values  */ }
```

(Implementation tip: factor the light and dark value sets into two selector
lists — `:root, :root[data-theme='light']` and
`@media(dark){:root}, :root[data-theme='dark']` — to avoid duplication drift.)

Everything already using `var(--…)` (tiles, HUD, modal, toast, editor) then
adapts for free. Audit for any remaining hardcoded hex in CSS and tokenise.

### 2. Canvas theming (`src/render/glyph-renderer.ts`)

Make the renderer read colours from the CSS tokens so there's **one source of
truth** and it can't drift from the DOM:

- Add `src/render/theme.ts`: `readCanvasColors(el = document.documentElement)`
  → reads the tokens via `getComputedStyle(el).getPropertyValue('--road')` etc.,
  returning a `{ bg, road, guide, current, ink, inkActive, start }` object.
- Cache the result; recompute when the theme changes (see §4). Reading computed
  style every frame is cheap but unnecessary — read once per theme change and
  on first draw.
- Replace the module-level `COLORS` constant with the resolved theme colours
  passed into `drawWordScene` / `drawGlyphsPreview` (or held in a module cache
  updated on theme change).

### 3. Theme setting (`src/state/settings.ts` + editor)

```ts
interface Settings {
  // …existing…
  theme: 'system' | 'light' | 'dark'  // default 'system'
}
```

- Apply on startup and on change: if `system`, remove `data-theme` from
  `<html>` (media query decides); else set `document.documentElement.dataset.theme`.
- Add a small **theme control** (segmented: Systeem / Licht / Donker) to the
  editor's settings card.
- A tiny `src/theme/apply.ts` with `applyTheme(setting)` called from `main.ts`
  before first paint (avoid a flash) and whenever the setting changes.

### 4. React to system changes

- Listen to `matchMedia('(prefers-color-scheme: dark)')` `change` events. When
  the setting is `system` and the OS flips, re-resolve canvas colours and
  request a redraw (the trace screen should expose/observe a "theme changed"
  signal, or the renderer re-reads on each `drawWordScene` guarded by a cached
  theme key). The DOM updates automatically via CSS; only the **canvas** needs a
  manual redraw.

### 5. Meta & manifest

- `index.html`: provide theme-color per scheme —
  ```html
  <meta name="theme-color" media="(prefers-color-scheme: light)" content="#fdf6e3">
  <meta name="theme-color" media="(prefers-color-scheme: dark)"  content="#1c1a17">
  ```
  On manual override, update the active `theme-color` via JS so the address/
  status bar matches.
- **Manifest limitation:** `theme_color`/`background_color` are single values
  used for the install splash; they can't be media-conditional. Pick a neutral
  splash (keep light, or choose a mid tone) and **document** that the splash
  doesn't follow dark mode. Not worth working around.

## Contrast & kid-friendliness

- The **road** in dark is a subtle lighter-than-bg band; the **ink trail** is a
  bright green so the child's progress pops. Verify road-vs-bg and ink-vs-road
  are clearly distinguishable.
- Recheck **celebration stars**, **start dot**, **off-path hint** text, toast,
  and modal overlays in dark.
- Aim for comfortable contrast (WCAG AA for text: ≥4.5:1). The palette above is
  a starting point — tune on the actual panel.
- Respect existing `prefers-reduced-motion` handling (unchanged).

## Testing

- **Unit (pure):** `applyTheme` sets/clears `data-theme` correctly for each
  setting; `readCanvasColors` returns the dark token set when `data-theme=dark`
  (jsdom can read inline styles, or test the resolution logic with a stubbed
  getComputedStyle).
- **Visual (Playwright):** render home + trace with
  `page.emulateMedia({ colorScheme: 'dark' })` and screenshot; repeat light.
  Confirm the canvas (not just the DOM) is dark. Add a dark screenshot to the
  contact-sheet/verify flow.
- **Manual:** flip the Tab S8 system theme and confirm live update; toggle the
  manual override.

## Edge cases

- **First-paint flash:** apply the theme (and set `data-theme`) as early as
  possible in `main.ts`, before mounting, so there's no light→dark flicker.
- Canvas does **not** auto-update on theme change — the redraw hook (§4) is
  required; otherwise the letter stays light-themed until the next interaction.
- Emoji/word images (`02`) are self-coloured and fine in both themes; just
  ensure the faint-background opacity still reads on a dark bg (maybe slightly
  higher opacity in dark).

## Phasing

1. Tokenise CSS + add dark palette + `prefers-color-scheme` (DOM dark mode).
2. Canvas theming via `theme.ts` + redraw-on-change (tracing surface dark).
3. Manual override setting + editor control + `theme-color` meta.
