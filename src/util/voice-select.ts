// Pure Dutch-voice selection, split out from speech.ts so it can be unit-tested
// without a browser. The key rule: only ever return a Dutch (nl-*) voice —
// speaking Dutch text with an English voice is exactly the "vijf → vi-jive" bug.
// See Prompts/lt-03/02-dutch-pronunciation-fix.md.

export interface VoiceLike {
  lang: string
  name: string
  voiceURI: string
  localService: boolean
}

const isDutch = (v: VoiceLike) => v.lang?.toLowerCase().startsWith('nl')

/**
 * Choose the best Dutch voice, or null if none is available. Preference order:
 * a still-present preferred voice → nl-NL over other nl-* → local (offline) over
 * remote. Returns null when only non-Dutch voices exist (never fall back to them).
 */
export function chooseDutchVoice<T extends VoiceLike>(voices: T[], preferredURI?: string): T | null {
  const dutch = voices.filter(isDutch)
  if (dutch.length === 0) return null
  if (preferredURI) {
    const preferred = dutch.find((v) => v.voiceURI === preferredURI)
    if (preferred) return preferred
  }
  const score = (v: T) => (v.lang.toLowerCase() === 'nl-nl' ? 2 : 0) + (v.localService ? 1 : 0)
  return dutch.slice().sort((a, b) => score(b) - score(a))[0]
}
