// Sound effects synthesised with the Web Audio API — no bundled audio files, so
// nothing extra to cache and it works fully offline. Every sound respects the
// global mute. The AudioContext is created lazily and resumed on the first user
// gesture (browsers block audio until then).

import { getSettings } from '../state/settings'

let ctx: AudioContext | null = null

function audioContext(): AudioContext | null {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

/** Call from the first pointerdown so audio is unblocked. */
export function unlockAudio(): void {
  const ac = audioContext()
  if (ac && ac.state === 'suspended') void ac.resume()
}

function blip(freq: number, start: number, dur: number, type: OscillatorType, peak: number): void {
  const ac = audioContext()
  if (!ac) return
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain).connect(ac.destination)
  osc.start(start)
  osc.stop(start + dur)
}

function enabled(): boolean {
  return !getSettings().muted && audioContext() !== null
}

/** Soft pop when a stroke is completed. */
export function playStrokeDone(): void {
  if (!enabled()) return
  const t = audioContext()!.currentTime
  blip(520, t, 0.14, 'triangle', 0.16)
}

/** Cheerful little arpeggio when the whole glyph is completed. */
export function playCelebrate(): void {
  if (!enabled()) return
  const t = audioContext()!.currentTime
  ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, t + i * 0.1, 0.22, 'sine', 0.18))
}
