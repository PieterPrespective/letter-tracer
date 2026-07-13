// Pronounce on an explicit speaker tap and, when nothing was said, tell the
// parent why — most importantly that the tablet has no Dutch TTS voice
// installed (the app never speaks Dutch with a non-Dutch voice). Auto-pronounce
// on completion uses pronounceItem directly and stays quiet on failure.

import { pronounceItem } from '../util/speech'
import { showToast } from './toast'
import type { ContentItem } from '../model/types'

const HINTS: Record<string, string> = {
  'no-voice':
    'Geen Nederlandse stem gevonden. Installeer een Nederlandse stem via Instellingen → Algemeen beheer → Tekst-naar-spraak.',
  off: 'Uitspraak staat uit. Zet het aan bij "Voor de ouders".',
  unavailable: 'Dit apparaat ondersteunt geen uitspraak.',
}

export function sayWithHint(item: ContentItem): void {
  const hint = HINTS[pronounceItem(item)]
  if (hint) showToast(hint)
}
