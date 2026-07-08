// Lightweight settings, persisted to localStorage. IndexedDB-backed settings
// and richer preferences (tolerance profiles, per-child) arrive in M4/M6; for
// now this just carries the global mute so audio can respect it everywhere.

export type ThemeSetting = 'system' | 'light' | 'dark'

export interface Settings {
  muted: boolean
  theme: ThemeSetting
}

const KEY = 'lt-settings'
const DEFAULTS: Settings = { muted: false, theme: 'system' }

let cache: Settings | null = null

export function getSettings(): Settings {
  if (cache) return cache
  try {
    cache = { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Settings>) }
  } catch {
    cache = { ...DEFAULTS }
  }
  return cache
}

export function updateSettings(patch: Partial<Settings>): Settings {
  cache = { ...getSettings(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    /* storage may be unavailable (private mode); keep the in-memory value */
  }
  return cache
}
