// Dutch text-to-speech via the Web Speech API, and the unified entry point that
// respects the speech setting. Phase 1 is TTS-only; a bundled-clip path
// (item.audioSrc) is reserved for phase 2. See Prompts/lt-02/01-audio-pronunciation.md.

import { pronounceText } from '../model/pronounce'
import { getSettings } from '../state/settings'
import type { ContentItem } from '../model/types'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

export function speechAvailable(): boolean {
  return synth() !== null
}

function dutchVoice(s: SpeechSynthesis): SpeechSynthesisVoice | null {
  // Voices can load async; re-query each call (populated after first use).
  const voices = s.getVoices()
  return voices.find((v) => v.lang?.toLowerCase().startsWith('nl')) ?? null
}

/** Speak Dutch text. No-op when unsupported or empty. */
export function speak(text: string): void {
  const s = synth()
  if (!s || !text) return
  s.cancel() // avoid overlapping utterances
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'
  u.rate = 0.9 // a touch slower for kids
  const v = dutchVoice(s)
  if (v) u.voice = v
  s.speak(u)
}

export function cancelSpeech(): void {
  synth()?.cancel()
}

/** Pronounce a content item, if speech is enabled. */
export function pronounceItem(item: ContentItem): void {
  if (!getSettings().speech) return
  // Phase 2 will play item.audioSrc here (correct letter klanken); for now, TTS.
  speak(pronounceText(item))
}
