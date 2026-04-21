import { describe, it, expect } from 'vitest'
import { firstEnabledSlot, migrateSlot, getDisplaySlot } from '../slot-utils'
import type { SlotPrefs } from '../slot-utils'

const ALL_OFF:  SlotPrefs = { am: false, pm: false, eve: false }
const AM_ONLY:  SlotPrefs = { am: true,  pm: false, eve: false }
const PM_ONLY:  SlotPrefs = { am: false, pm: true,  eve: false }
const EVE_ONLY: SlotPrefs = { am: false, pm: false, eve: true  }
const AM_PM:    SlotPrefs = { am: true,  pm: true,  eve: false }
const PM_EVE:   SlotPrefs = { am: false, pm: true,  eve: true  }
const ALL_ON:   SlotPrefs = { am: true,  pm: true,  eve: true  }

describe('firstEnabledSlot', () => {
  it('returns null when all off',   () => expect(firstEnabledSlot(ALL_OFF)).toBeNull())
  it('returns am when only am',     () => expect(firstEnabledSlot(AM_ONLY)).toBe('am'))
  it('returns pm when only pm',     () => expect(firstEnabledSlot(PM_ONLY)).toBe('pm'))
  it('returns eve when only eve',   () => expect(firstEnabledSlot(EVE_ONLY)).toBe('eve'))
  it('returns am when am+pm',       () => expect(firstEnabledSlot(AM_PM)).toBe('am'))
  it('returns pm when pm+eve',      () => expect(firstEnabledSlot(PM_EVE)).toBe('pm'))
  it('returns am when all on',      () => expect(firstEnabledSlot(ALL_ON)).toBe('am'))
})

describe('migrateSlot', () => {
  it('preserves slot when all off',               () => expect(migrateSlot('am', ALL_OFF)).toBe('am'))
  it('preserves null when all off',               () => expect(migrateSlot(null, ALL_OFF)).toBeNull())
  it('migrates null to first enabled (am)',        () => expect(migrateSlot(null, AM_ONLY)).toBe('am'))
  it('migrates null to first enabled (pm)',        () => expect(migrateSlot(null, PM_ONLY)).toBe('pm'))
  it('preserves matching enabled slot',            () => expect(migrateSlot('am', AM_PM)).toBe('am'))
  it('migrates am to pm when am disabled',        () => expect(migrateSlot('am', PM_ONLY)).toBe('pm'))
  it('migrates pm to am when pm disabled',        () => expect(migrateSlot('pm', AM_ONLY)).toBe('am'))
  it('preserves eve when eve enabled',             () => expect(migrateSlot('eve', ALL_ON)).toBe('eve'))
  it('migrates eve to am when eve disabled',       () => expect(migrateSlot('eve', AM_ONLY)).toBe('am'))
  it('migrates null to eve when only eve',         () => expect(migrateSlot(null, EVE_ONLY)).toBe('eve'))
})

describe('getDisplaySlot', () => {
  it('returns null when no slots enabled',                    () => expect(getDisplaySlot('am', ALL_OFF)).toBeNull())
  it('returns explicit enabled slot (pm)',                    () => expect(getDisplaySlot('pm', ALL_ON)).toBe('pm'))
  it('returns first slot for orphan (am task, pm-only)',      () => expect(getDisplaySlot('am', PM_ONLY)).toBe('pm'))
  it('returns first slot for null with am+pm',               () => expect(getDisplaySlot(null, AM_PM)).toBe('am'))
  it('returns eve for eve slot when eve enabled',             () => expect(getDisplaySlot('eve', EVE_ONLY)).toBe('eve'))
  it('returns first enabled for eve slot when eve disabled',  () => expect(getDisplaySlot('eve', AM_ONLY)).toBe('am'))
  it('returns null for null slot when all off',               () => expect(getDisplaySlot(null, ALL_OFF)).toBeNull())
})
