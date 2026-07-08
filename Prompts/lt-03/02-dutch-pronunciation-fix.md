# 02 — Fix Dutch pronunciation (English voice on Dutch words)

Pronunciation currently comes out **English** on Dutch text — e.g. "vijf" is
read "vi-jive" instead of ~"vaif", "zeven" mangled, etc. This makes the audio
worse than useless for counting.

## Root cause

`src/util/speech.ts` sets `utterance.lang = 'nl-NL'` and tries to pick a Dutch
voice, but:

1. **Voices load asynchronously.** `speechSynthesis.getVoices()` is often empty
   on first call and only populates after a `voiceschanged` event. If the user
   taps 🔊 before that, no Dutch voice is found.
2. **When no Dutch voice is selected, the engine uses the default voice** —
   usually **English** — which applies English phonetics to Dutch text. Setting
   `lang='nl-NL'` alone does **not** fix pronunciation if the actual voice is
   English. This is the "vi-jive" effect.
3. No preference/among Dutch voices, no caching, no way for a parent to pick.

So the fix has two prongs: **(A)** reliably select a real Dutch voice, and
**(B)** guarantee correct audio for the numbers regardless of device voices via
**bundled clips**.

## Part A — robust Dutch voice selection (`src/util/speech.ts`)

- **Load voices properly:** cache `getVoices()`, and refresh on the
  `voiceschanged` event (and once on init). Don't pick from an empty list.
- **Pick the best Dutch voice**, in order:
  1. a parent-chosen voice (see settings) if still present;
  2. exact `nl-NL`, then any `nl-*` (e.g. `nl-BE`);
  3. prefer `localService === true` (works offline) and a non-novelty name.
- **If no Dutch voice exists, do NOT speak with an English voice.** That's the
  bug. Instead: fall back to a bundled clip if available (Part B), else stay
  silent and surface a note (below). Speaking Dutch text with an English voice
  should be avoided entirely.
- Expose `dutchVoiceAvailable(): boolean` for the UI.
- Keep `utterance.lang = 'nl-NL'` **and** set `utterance.voice` to the chosen
  Dutch voice (both matter).

### Voice picker + guidance (settings/editor)

- If Dutch voices exist, list them in the editor (a small select of
  `nl` voices by `name`), store the chosen `voiceURI`/`name` in settings, and
  use it.
- If **none** exist, show a gentle note: *"Geen Nederlandse stem gevonden.
  Installeer een Nederlandse stem in de systeeminstellingen (Tekst-naar-spraak),
  of gebruik de ingebouwde geluidsfragmenten."* On Android/Samsung this means
  installing the Dutch voice for Google/Samsung TTS.

## Part B — bundled Dutch number clips (the reliable fix)

Device Dutch voices are not guaranteed (and quality varies), so make **numbers**
— the thing the child counts — always correct and offline:

- Record/source small Dutch clips for **nul…twintig** (0–20 covers digits and
  sum results) — and optionally the base words. CC0/own recording; `.opus`/
  `.mp3`, mono, trimmed, a few KB each (<~300 KB total).
- Wire via `ContentItem.audioSrc` (already in the model) **or** a
  `char/number → clip` manifest imported through Vite (hashed + precached; add
  the audio extension to `workbox.globPatterns` in `vite.config.ts`).
- `pronounceItem(item)` order becomes: **clip if available → Dutch TTS voice →
  (nothing)**. For a `sum`, play the result's number clip (or a short sequence);
  for a `number`, its clip; words/letters fall through to TTS.
- This is exactly pronunciation **phase 2** groundwork from lt-02/01, scoped
  first to numbers because that's the son's use case.

## Behaviour summary

| Content | Best available |
|---|---|
| Numbers (0–20) | **bundled clip** (always correct, offline) |
| Words | Dutch TTS voice; clip later |
| Letters | Dutch TTS voice (name); klank clips are the separate phase-2 task |
| No Dutch voice & no clip | silent + a settings note (never English) |

## Testing

- **Unit:** voice-selection logic with a mocked voice list — picks `nl-NL` over
  `nl-BE` over English; returns null when only English is present; honours a
  stored preference. `dutchVoiceAvailable()` reflects the list.
- **Browser:** stub `speechSynthesis` with (a) a Dutch voice → assert it's used
  and `lang='nl-NL'`; (b) only English voices → assert we do **not** speak with
  it (fall back/silent). Assert a bundled number clip plays when present.
- **Device (Tab S8):** confirm which Dutch voices are installed; verify "vijf",
  "zeven", "negen" sound right via the chosen voice and/or clips.

## Open questions

- Ship **bundled number clips** now (recommended — definitive fix), or first
  try to rely on device Dutch voices and only add clips if needed?
- Which numbers to clip: 0–10, or 0–20 (to cover sum results)?
- Add a **voice picker** in settings, or auto-select silently?
