# 01 — Audio pronunciation

A button that plays the **Dutch pronunciation** of the current exercise:
a letter, a number, or a word (and optionally a sum).

## Goal & scope

- On the trace screen, a **speaker button** (🔊) plays the pronunciation of the
  current item. Available for letters, numbers, and words (sums optional).
- Optionally auto-play once when an exercise opens, and again on completion.
- Works for **parent-added words** too (data-driven).
- Respects an audio setting and works offline for the base set.

## The pedagogy decision (confirm first)

What should a **letter** say?

- **Klank** (the sound), e.g. `m` → "mmm", `s` → "sss". This is what early
  Dutch reading (Pennenstreken) emphasises. **Web Speech (TTS) cannot do this**
  — TTS reads the *letter name*.
- **Letternaam** (the name), e.g. `m` → "em", `a` → "aa". TTS does this fine.

Numbers say the **number word** ("2" → "twee"); words say the **whole word**
("kat"). Those are straightforward for TTS.

→ **Recommendation:** support both via a setting `letterAudio: 'klank' | 'naam'`
defaulting to **klank**. Because klank needs recorded/rendered clips, this
splits the work into two phases (below). Confirm the default with a teacher/parent.

## Two production strategies

| | Web Speech API (`speechSynthesis`) | Bundled clips |
|---|---|---|
| Assets | none | audio files to produce/ship |
| Offline | best-effort (depends on installed nl-NL voice) | guaranteed (precached) |
| Letter klanken | ✗ (names only) | ✓ |
| User words | ✓ dynamic | ✗ (unknown ahead of time) |
| Quality | device-dependent | consistent |

**Recommended: hybrid.**
- **Bundled clips** for the fixed base set — letters (klanken), digits, and base
  words — so the core is correct and offline.
- **Web Speech (nl-NL)** fallback for anything without a clip (mainly
  parent-added words), best-effort.

### Phasing

- **Phase 1 (TTS only):** numbers + words correct; letters use `naam` via TTS;
  ship the speaker button and setting. Immediate value, no asset work.
- **Phase 2 (clips):** add bundled klank clips for letters (+ optional digit and
  base-word clips) and switch the default letter mode to `klank`.

## Data model additions (`src/model/types.ts`)

```ts
interface ContentItem {
  // …existing…
  /** Override text spoken by TTS (defaults derived from type/prompt). */
  say?: string
  /** Optional pre-recorded/bundled clip URL (wins over TTS when present). */
  audioSrc?: string
}
```

Defaults (no need to store when derivable):
- letter → klank text from a map, or the letter name; number → number word;
  word → the word (`prompt`); sum → e.g. "twee plus drie is vijf" (optional).

Add small maps in a new `src/model/pronounce.ts`:
- `LETTER_KLANK: Record<string,string>` (a→"aa"-ish spelled for TTS, m→"mmm", …)
  — note TTS klank spelling is approximate; real klanken come from clips.
- `DIGIT_WORD: Record<string,string>` (`'0'`→"nul" … `'9'`→"negen").
- `pronounceText(item): string` — the text to speak (uses `say` if set).

## Architecture

- **`src/util/speech.ts`** — TTS wrapper:
  - `getDutchVoice()` — pick a `nl`/`nl-NL` voice from
    `speechSynthesis.getVoices()` (voices load async → also listen to
    `voiceschanged`). Cache the choice.
  - `speak(text)` — cancel any current utterance, set `lang='nl-NL'`, voice,
    a slightly slower `rate` (~0.9) for kids; no-op if unsupported.
  - `speechAvailable()` — feature + voice check.
- **`src/util/clips.ts`** (phase 2) — bundled clips:
  - a manifest `char/word → imported audio URL` (Vite asset imports so they're
    hashed + precached), played via `new Audio(url)` or a decoded WebAudio buffer.
- **`src/audio/pronounce.ts`** (or extend `util/audio.ts`) — unified entry:
  - `pronounce(item)`: if `audioSrc`/clip exists → play clip; else if TTS
    available → `speak(pronounceText(item))`; else → silent (button still shows,
    does nothing / disabled state).
- **Autoplay policy:** browsers block audio before a user gesture. The speaker
  button *is* the gesture. If auto-play-on-open is wanted, gate it on "has the
  user interacted this session" (reuse the `unlockAudio()` gesture pattern from
  `util/audio.ts`), otherwise skip silently.

## Settings (`src/state/settings.ts`)

Separate **speech** from **sound effects** so a parent can keep effects on but
speech off (or vice-versa):

```ts
interface Settings {
  muted: boolean          // existing: effects (pops/celebration)
  speech: boolean         // new: pronunciation on/off (default true)
  letterAudio: 'klank' | 'naam'  // new (default 'klank')
}
```

Editor gains toggles for these (see the editor screen).

## UI

- **Trace HUD** (`src/ui/screens/trace.ts`): add a 🔊 round button next to the
  prompt. Tapping calls `pronounce(item)`. Disable/hide if speech is off in
  settings and there's no clip.
- **On completion:** optionally auto-pronounce as part of the celebration.
- **On open:** optional auto-pronounce (gated on prior interaction).
- **Home tiles** (optional): long-press a tile to hear it without entering.
- For **words**, pronunciation pairs naturally with the background image (`02`).

## Clip production (phase 2 — content task, flag it)

Producing correct Dutch klank audio is a **content task**, not just code:
- **Options:** (a) record a Dutch speaker; (b) source CC0/CC-BY Dutch
  phoneme/letter-sound audio (verify licence, attribute); (c) build-time render
  via a TTS engine — note most engines still say *names*, and klank rendering is
  poor, so (a)/(b) are preferred for klanken.
- **Format:** small compressed files (`.opus` or `.mp3`), mono, normalised
  loudness, trimmed silence. Target a few KB each. ~26 letters + 10 digits +
  base words ≈ <1 MB total — fine to precache.
- **Wiring:** put under `src/assets/audio/…`, import via Vite so they're hashed
  and picked up by the PWA precache glob (add `mp3`/`opus` to
  `workbox.globPatterns` in `vite.config.ts`).
- Track which clips exist in a small checklist (like `GLYPH-REVIEW.md`).

## Testing

- **Unit (pure):** `pronounce.ts` — `pronounceText(item)` for letter (both
  modes), number, word, and `say` override; `DIGIT_WORD` completeness.
- **Speech wrapper:** unit-test voice selection with a mocked `speechSynthesis`
  (stub `getVoices`); assert `speak` no-ops when unavailable.
- **Browser:** stub `window.speechSynthesis` to record utterances; click the
  speaker button and assert the expected text/lang. (Real voice output isn't
  assertable headless.)
- **Device:** confirm a Dutch voice exists on the Tab S8 and the klank clips
  sound right (manual).

## Edge cases & notes

- No nl-NL voice installed → TTS falls back to default voice or silence; surface
  nothing scary, just do nothing (button remains for clip-backed items).
- iOS/Safari: `speechSynthesis` needs a gesture and can be flaky; acceptable
  since primary target is Android/Samsung Internet.
- Cancel in-flight speech when navigating away or tapping again (avoid overlap).
- Keep pronunciation independent of the **effects** mute so tuning one doesn't
  silence the other.
