// Dutch text-to-speech via the Web Speech API. Voices load asynchronously, so
// we cache them and refresh on `voiceschanged`. Crucially we ONLY ever speak
// with a Dutch voice — never fall back to an English voice on Dutch text (that
// was the "vijf → vi-jive" bug). A bundled-clip path (item.audioSrc) takes
// precedence when present. See Prompts/lt-03/02-dutch-pronunciation-fix.md.

import { pronounceText } from '../model/pronounce'
import { getSettings } from '../state/settings'
import { chooseDutchVoice } from './voice-select'
import type { ContentItem } from '../model/types'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

let voices: SpeechSynthesisVoice[] = []
const voiceListeners = new Set<() => void>()

function refreshVoices(): void {
  const s = synth()
  if (!s) return
  voices = s.getVoices()
  for (const fn of voiceListeners) fn()
}

/** Set up voice caching. Call once at startup. */
export function initSpeech(): void {
  const s = synth()
  if (!s) return
  refreshVoices()
  // Voices often aren't ready synchronously; repopulate when they arrive.
  s.addEventListener?.('voiceschanged', refreshVoices)
}

export function speechAvailable(): boolean {
  return synth() !== null
}

/** All installed Dutch voices (for the settings picker). */
export function dutchVoices(): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang?.toLowerCase().startsWith('nl'))
}

export function dutchVoiceAvailable(): boolean {
  return dutchVoices().length > 0
}

/** Subscribe to voice-list changes (the picker repopulates). Returns an unsub. */
export function onVoicesChanged(fn: () => void): () => void {
  voiceListeners.add(fn)
  return () => voiceListeners.delete(fn)
}

/** Speak Dutch text with a Dutch voice. Returns false (and stays silent) if no
 *  Dutch voice is available — we never mispronounce with an English voice. */
export function speak(text: string): boolean {
  const s = synth()
  if (!s || !text) return false
  const voice = chooseDutchVoice(voices, getSettings().voiceURI)
  if (!voice) return false
  s.cancel() // avoid overlapping utterances
  const u = new SpeechSynthesisUtterance(text)
  u.voice = voice
  u.lang = voice.lang || 'nl-NL'
  u.rate = 0.9 // a touch slower for kids
  s.speak(u)
  return true
}

export function cancelSpeech(): void {
  synth()?.cancel()
}

function playClip(src: string): void {
  try {
    void new Audio(src).play()
  } catch {
    /* best effort */
  }
}

/** Pronounce a content item if speech is enabled: bundled clip → Dutch TTS. */
export function pronounceItem(item: ContentItem): void {
  if (!getSettings().speech) return
  if (item.audioSrc) {
    playClip(item.audioSrc)
    return
  }
  speak(pronounceText(item))
}
