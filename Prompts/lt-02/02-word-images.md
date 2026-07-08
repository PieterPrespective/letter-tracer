# 02 — Word images

For **word** exercises, show an image of what the word means (e.g. "kat" → a
cat) behind the tracing, so the child connects the written word to its meaning.

## Goal & scope

- While tracing a word, a picture of its meaning sits **behind** the letters,
  faint so it doesn't compete with the road, and **reveals** (brightens /
  animates) on completion as a reward.
- Works offline and for **parent-added words**.
- Purely an aid — never required to trace, and absent images degrade to nothing.

## Image source — options

| Approach | Offline | Assets | User words | Notes |
|---|---|---|---|---|
| **Emoji** (recommended) | ✓ system font | none | ✓ (pick in editor) | Cute, licence-free, tiny |
| Bundled illustrations | ✓ | SVG/PNG set to ship + licence | ✗ for custom | Nicer, more work |
| Parent upload | ✓ (IndexedDB) | none | ✓ | Flexible; storage + resizing |
| Online image search | ✗ | none | ✓ | Rejected: offline + licensing |

**Recommendation:** **emoji-first**, with **parent upload** as an optional
later enhancement. Emoji covers most concrete nouns a child traces (kat 🐱,
boom 🌳, vis 🐟, aap 🐵, maan 🌙, roos 🌹, hond 🐶, huis 🏠, bal ⚽, auto 🚗…),
renders offline via the system emoji font, needs no assets, and has no licensing
concerns. Bundled illustrations can be layered in later for the base set if a
richer look is wanted.

## Data model additions (`src/model/types.ts`)

```ts
interface ContentItem {
  // …existing…
  image?:
    | { kind: 'emoji'; value: string }      // e.g. "🐱"
    | { kind: 'dataurl'; value: string }    // parent-uploaded, resized
}
```

- Base words get `{ kind: 'emoji', value: '🐱' }` in `scripts/build-glyphs.ts`
  via a `WORD_EMOJI: Record<string,string>` map (only for words that have an
  obvious emoji; others simply have no image).
- User words: default no image; the editor lets the parent pick an emoji (or
  upload). Composed in `src/model/compose.ts` (accept an optional `image` arg).

## Rendering (`src/ui/screens/trace.ts` + `src/render/`)

- Draw the image **behind** the glyph road, only for items with `image`:
  - **Emoji:** render as large centred text on the canvas (or a positioned DOM
    element) at low opacity (~0.12–0.2) while tracing.
  - **dataurl:** draw the decoded image `object-fit: contain`, centred, same low
    opacity.
- Layering choice:
  - *Canvas:* draw the emoji/image first in `drawWordScene` (before the road) so
    everything composites in one place and scales with the canvas. Emoji via
    `ctx.font`/`fillText`; images via a cached `HTMLImageElement` drawn with
    `globalAlpha`.
  - *DOM (alternative):* a positioned element behind the `<canvas>` (canvas has
    transparent background over it). Simpler for `object-fit`, but two surfaces
    to keep aligned. **Prefer canvas** for single-surface simplicity.
- **Reveal on completion:** when the word is finished, animate the image from
  faint → ~0.6 opacity (a short fade/scale), as part of the celebration in
  `render/feedback.ts`. A nice "you spelled the cat!" payoff.
- Only for **words** (and optionally sums/letters if an image is ever set);
  letters/digits normally have none.

## Editor (`src/ui/screens/editor.ts`)

- In the "Nieuw woord" form, add an **emoji picker**:
  - A compact palette of common kid-friendly emoji (animals, nature, everyday
    objects) as tappable buttons, **plus** a text input that accepts a pasted
    emoji (single grapheme). Selected emoji shows next to the word field.
  - Store it on the composed item's `image`.
- **Optional (later) upload:** a file input → downscale via an offscreen canvas
  to ~256–512px, export to a compressed dataURL (JPEG/WebP), store on the item
  in IndexedDB. Warn on large files; cap dimensions to bound storage.
- The "Mijn inhoud" list row can show the emoji/thumbnail next to the word.

## Base content

- Add `WORD_EMOJI` for the existing base words in `scripts/build-glyphs.ts`:
  aap 🐵, boom 🌳, kat 🐱, maan 🌙, roos 🌹, vis 🐟. Regenerate
  `base-content.json`. Schema already allows an optional field; extend
  `src/model/schema.ts` to validate/pass through `image`.

## Offline

- Emoji: system font, always offline.
- Uploaded images: stored in IndexedDB (offline).
- No runtime network fetches — keep it that way (don't add an image-search API).

## Accessibility

- The image is **decorative**; mark it so (it's on the canvas, so no extra ARIA
  needed, but if a DOM element is used, `aria-hidden="true"`).
- Never gate completion or scoring on the image.
- Keep opacity low enough that the road/letters remain the clear focus
  (contrast matters more in dark mode — see `03`).

## Testing

- **Unit:** schema accepts/validates `image`; `composeWord(text, image?)` sets
  it; `WORD_EMOJI` maps only known words.
- **Browser/visual:** a word with an emoji shows it faint while tracing and
  brighter on completion; a word without an image renders unchanged.
- **Editor:** picking an emoji then saving persists it (survives reload).

## Open questions

- Emoji only, or invest in a bundled illustration set for the base words?
- Should the reward reveal be full-opacity (bold payoff) or subtle? Tune on
  device with a child.
