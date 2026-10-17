import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_STORAGE_KEY, type Settings } from './settings'

const valid: Settings = {
  familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }],
  calendars: { readIds: ['primary'], writeId: 'primary' },
  weather: { location: { name: 'Warszawa', latitude: 52.23, longitude: 21.01 } },
  pin: '1234',
}

const storageWith = (value: string | null) => ({ getItem: () => value })

afterEach(() => vi.restoreAllMocks())

describe('loadSettings', () => {
  it('returns defaults when nothing is stored', () => {
    expect(loadSettings(storageWith(null))).toEqual(DEFAULT_SETTINGS)
  })

  it('returns stored valid settings', () => {
    expect(loadSettings(storageWith(JSON.stringify(valid)))).toEqual(valid)
  })

  it('falls back to defaults when the shape is invalid', () => {
    expect(loadSettings(storageWith(JSON.stringify({ ...valid, pin: 'abc' })))).toEqual(DEFAULT_SETTINGS)
  })

  it('falls back to defaults and logs when the JSON is broken', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(loadSettings(storageWith('{nope'))).toEqual(DEFAULT_SETTINGS)
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('rejects out-of-range coordinates', () => {
    const bad = { ...valid, weather: { location: { name: 'X', latitude: 200, longitude: 0 } } }
    expect(loadSettings(storageWith(JSON.stringify(bad)))).toEqual(DEFAULT_SETTINGS)
  })
})

describe('saveSettings', () => {
  it('stores the settings under the versioned key', () => {
    const setItem = vi.fn()
    saveSettings({ setItem }, valid)
    expect(setItem).toHaveBeenCalledWith(SETTINGS_STORAGE_KEY, JSON.stringify(valid))
  })
})
