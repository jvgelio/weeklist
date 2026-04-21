export type SlotPrefs = { am: boolean; pm: boolean; eve: boolean }

export function firstEnabledSlot(prefs: SlotPrefs): 'am' | 'pm' | 'eve' | null {
  if (prefs.am) return 'am'
  if (prefs.pm) return 'pm'
  if (prefs.eve) return 'eve'
  return null
}

export function migrateSlot(currentSlot: string | null, prefs: SlotPrefs): string | null {
  const first = firstEnabledSlot(prefs)
  if (!first) return currentSlot
  if (currentSlot === 'am' && prefs.am) return currentSlot
  if (currentSlot === 'pm' && prefs.pm) return currentSlot
  if (currentSlot === 'eve' && prefs.eve) return currentSlot
  return first
}

export function getDisplaySlot(slot: string | null, prefs: SlotPrefs): 'am' | 'pm' | 'eve' | null {
  const first = firstEnabledSlot(prefs)
  if (!first) return null
  if (slot === 'am' && prefs.am) return 'am'
  if (slot === 'pm' && prefs.pm) return 'pm'
  if (slot === 'eve' && prefs.eve) return 'eve'
  return first
}
