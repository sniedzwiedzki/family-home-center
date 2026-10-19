import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, loadSettings, saveSettings, SETTINGS_STORAGE_KEY, type Settings } from './settings'

const valid: Settings = {
  familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }],
  calendars: { readIds: ['primary'], writeId: 'primary', known: [{ id: 'primary', name: 'Ja', canWrite: true }] },
  google: { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh' },
  gemini: { apiKey: 'fake-key', model: 'gemini-3.8-flash' },
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

  it('still loads settings saved before the Google fields existed', () => {
    const { google: _google, gemini: _gemini, calendars, ...older } = valid
    const stored = { ...older, calendars: { readIds: calendars.readIds, writeId: calendars.writeId } }
    expect(loadSettings(storageWith(JSON.stringify(stored)))).toEqual({
      ...older,
      google: null,
      gemini: null,
      calendars: { readIds: ['primary'], writeId: 'primary', known: [] },
    })
  })

  it('rejects a Gemini key with an empty value', () => {
    const broken = { ...valid, gemini: { apiKey: ' ', model: 'gemini-3.8-flash' } }
    expect(loadSettings(storageWith(JSON.stringify(broken)))).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects Google credentials with an empty value', () => {
    const broken = { ...valid, google: { clientId: 'x', clientSecret: ' ', refreshToken: 'y' } }
    expect(loadSettings(storageWith(JSON.stringify(broken)))).toEqual(DEFAULT_SETTINGS)
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
