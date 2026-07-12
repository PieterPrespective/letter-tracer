// Pure mapping from a ContentItem to the Dutch text to speak. Phase 1 uses TTS
// (Web Speech), so letters are read as their *name* ("a" → "aa"); correct letter
// *klanken* need recorded clips (phase 2). See Prompts/lt-02/01-audio-pronunciation.md.

import type { ContentItem } from './types'

export const DIGIT_WORD: Record<string, string> = {
  '0': 'nul',
  '1': 'een',
  '2': 'twee',
  '3': 'drie',
  '4': 'vier',
  '5': 'vijf',
  '6': 'zes',
  '7': 'zeven',
  '8': 'acht',
  '9': 'negen',
}

function numberWord(n: number | string): string {
  return DIGIT_WORD[String(n)] ?? String(n)
}

/**
 * Letters whose Dutch TTS *name* is unfamiliar to young children, overridden to
 * the name kids actually use. `y` is formally "ypsilon" / "i-grec", but children
 * learn it as "ij".
 */
export const LETTER_SAY: Record<string, string> = {
  y: 'ij',
}

/** The text TTS should speak for an item. An explicit `say` always wins. */
export function pronounceText(item: ContentItem): string {
  if (item.say) return item.say
  switch (item.type) {
    case 'number':
      return numberWord(item.prompt)
    case 'sum':
      return item.sum
        ? `${numberWord(item.sum.a)} ${item.sum.op === '+' ? 'plus' : 'min'} ${numberWord(item.sum.b)} is ${numberWord(item.sum.result)}`
        : item.prompt
    case 'word':
      return item.prompt
    case 'letter':
    default:
      // TTS reads the letter name in nl-NL; klank clips come in phase 2.
      return LETTER_SAY[item.prompt.toLowerCase()] ?? item.prompt
  }
}
