import { describe, expect, it } from 'vitest'
import { chooseDutchVoice, type VoiceLike } from './voice-select'

const v = (lang: string, name: string, localService = true): VoiceLike => ({
  lang,
  name,
  voiceURI: `${name}`,
  localService,
})

describe('chooseDutchVoice', () => {
  it('returns null when no Dutch voice exists (never picks English)', () => {
    expect(chooseDutchVoice([v('en-US', 'Alex'), v('en-GB', 'Daniel')])).toBeNull()
  })

  it('prefers nl-NL over nl-BE', () => {
    const chosen = chooseDutchVoice([v('nl-BE', 'Ellen'), v('nl-NL', 'Xander')])
    expect(chosen?.name).toBe('Xander')
  })

  it('prefers a local (offline) voice among equals', () => {
    const chosen = chooseDutchVoice([v('nl-NL', 'Remote', false), v('nl-NL', 'Local', true)])
    expect(chosen?.name).toBe('Local')
  })

  it('honours a still-present preferred voice', () => {
    const chosen = chooseDutchVoice([v('nl-NL', 'Xander'), v('nl-NL', 'Lotte')], 'Lotte')
    expect(chosen?.name).toBe('Lotte')
  })

  it('falls back to best when the preferred voice is gone', () => {
    const chosen = chooseDutchVoice([v('nl-NL', 'Xander')], 'Missing')
    expect(chosen?.name).toBe('Xander')
  })
})
