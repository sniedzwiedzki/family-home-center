import { describe, expect, it } from 'vitest'
import type { DiscoveredCalendar } from '../google/calendarList'
import { DEFAULT_SETTINGS } from './settings'
import {
  applyDiscovery,
  draftFromSettings,
  EMPTY_GOOGLE_DRAFT,
  googleDraftError,
  googleSettingsFromDraft,
  isGoogleDraftEmpty,
} from './googleDraft'

const cal = (id: string, extra: Partial<DiscoveredCalendar> = {}): DiscoveredCalendar => ({
  id,
  name: id,
  canWrite: false,
  selected: false,
  primary: false,
  ...extra,
})
const filled = { ...EMPTY_GOOGLE_DRAFT, clientId: 'id', clientSecret: 'secret', refreshToken: 'token' }

describe('draftFromSettings', () => {
  it('is empty without Google settings', () => {
    expect(draftFromSettings(DEFAULT_SETTINGS)).toEqual(EMPTY_GOOGLE_DRAFT)
  })

  it('copies credentials and the calendar choices', () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      google: { clientId: 'id', clientSecret: 'secret', refreshToken: 'token' },
      calendars: { readIds: ['a'], writeId: 'a', known: [{ id: 'a', name: 'A', canWrite: true }] },
    }
    expect(draftFromSettings(settings)).toEqual({ ...filled, readIds: ['a'], writeId: 'a', known: [{ id: 'a', name: 'A', canWrite: true }] })
  })
})

describe('googleDraftError / isGoogleDraftEmpty', () => {
  it('accepts all three fields or none, ignoring spaces', () => {
    expect(googleDraftError(EMPTY_GOOGLE_DRAFT)).toBeNull()
    expect(googleDraftError({ ...EMPTY_GOOGLE_DRAFT, clientId: '   ' })).toBeNull()
    expect(googleDraftError(filled)).toBeNull()
    expect(isGoogleDraftEmpty(EMPTY_GOOGLE_DRAFT)).toBe(true)
    expect(isGoogleDraftEmpty(filled)).toBe(false)
  })

  it('asks for the missing fields when only some are filled', () => {
    const message = 'Wypełnij wszystkie trzy pola Google albo wyczyść je wszystkie.'
    expect(googleDraftError({ ...EMPTY_GOOGLE_DRAFT, clientId: 'id' })).toBe(message)
    expect(googleDraftError({ ...filled, refreshToken: '' })).toBe(message)
    expect(isGoogleDraftEmpty({ ...EMPTY_GOOGLE_DRAFT, clientId: 'id' })).toBe(false)
  })
})

describe('applyDiscovery', () => {
  const discovered = [
    cal('me@x', { name: 'Ja', canWrite: true, selected: true, primary: true }),
    cal('family@x', { name: 'Rodzina', canWrite: true, selected: true }),
    cal('holidays@x', { name: 'Święta' }),
  ]

  it('shows what Google shows and writes to the primary calendar by default', () => {
    const next = applyDiscovery(filled, discovered)
    expect(next.readIds).toEqual(['me@x', 'family@x'])
    expect(next.writeId).toBe('me@x')
    expect(next.known).toEqual([
      { id: 'me@x', name: 'Ja', canWrite: true },
      { id: 'family@x', name: 'Rodzina', canWrite: true },
      { id: 'holidays@x', name: 'Święta', canWrite: false },
    ])
  })

  it('keeps earlier choices that still exist', () => {
    const next = applyDiscovery({ ...filled, readIds: ['holidays@x', 'gone@x'], writeId: 'family@x' }, discovered)
    expect(next.readIds).toEqual(['holidays@x'])
    expect(next.writeId).toBe('family@x')
  })

  it('does not keep a write calendar that became read-only or disappeared', () => {
    expect(applyDiscovery({ ...filled, writeId: 'holidays@x' }, discovered).writeId).toBe('me@x')
    expect(applyDiscovery({ ...filled, writeId: 'gone@x' }, discovered).writeId).toBe('me@x')
  })

  it('writes to the first writable calendar when there is no writable primary one', () => {
    const next = applyDiscovery(filled, [cal('ro@x'), cal('w@x', { canWrite: true })])
    expect(next.writeId).toBe('w@x')
  })

  it('has no write calendar when nothing is writable, and no selection when Google selects nothing', () => {
    const next = applyDiscovery(filled, [cal('ro@x')])
    expect(next.writeId).toBeNull()
    expect(next.readIds).toEqual([])
  })
})

describe('googleSettingsFromDraft', () => {
  it('stores nothing when the credentials were cleared, calendars included', () => {
    expect(googleSettingsFromDraft({ ...EMPTY_GOOGLE_DRAFT, readIds: ['a'], writeId: 'a', known: [{ id: 'a', name: 'A', canWrite: true }] })).toEqual({
      google: null,
      calendars: { readIds: [], writeId: null, known: [] },
    })
  })

  it('stores trimmed credentials and the calendar choices', () => {
    const draft = { ...filled, clientId: ' id ', readIds: ['a'], writeId: 'a', known: [{ id: 'a', name: 'A', canWrite: true }] }
    expect(googleSettingsFromDraft(draft)).toEqual({
      google: { clientId: 'id', clientSecret: 'secret', refreshToken: 'token' },
      calendars: { readIds: ['a'], writeId: 'a', known: [{ id: 'a', name: 'A', canWrite: true }] },
    })
  })
})
