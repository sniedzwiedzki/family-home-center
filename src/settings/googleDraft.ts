import type { DiscoveredCalendar } from '../google/calendarList'
import type { Settings } from './settings'

export interface GoogleDraft {
  clientId: string
  clientSecret: string
  refreshToken: string
  readIds: string[]
  writeId: string | null
  known: Settings['calendars']['known']
}

export const EMPTY_GOOGLE_DRAFT: GoogleDraft = { clientId: '', clientSecret: '', refreshToken: '', readIds: [], writeId: null, known: [] }

export const draftFromSettings = (settings: Settings): GoogleDraft => ({
  clientId: settings.google?.clientId ?? '',
  clientSecret: settings.google?.clientSecret ?? '',
  refreshToken: settings.google?.refreshToken ?? '',
  readIds: settings.calendars.readIds,
  writeId: settings.calendars.writeId,
  known: settings.calendars.known,
})

const filled = (draft: GoogleDraft) => [draft.clientId, draft.clientSecret, draft.refreshToken].map((value) => value.trim() !== '')

export const isGoogleDraftEmpty = (draft: GoogleDraft): boolean => filled(draft).every((isFilled) => !isFilled)

/** Either all three credentials are given or none of them. */
export const googleDraftError = (draft: GoogleDraft): string | null =>
  isGoogleDraftEmpty(draft) || filled(draft).every(Boolean) ? null : 'Wypełnij wszystkie trzy pola Google albo wyczyść je wszystkie.'

/** Keeps the user's earlier choices that still exist; otherwise Google's own selection and a sensible write calendar. */
export function applyDiscovery(draft: GoogleDraft, discovered: readonly DiscoveredCalendar[]): GoogleDraft {
  const ids = new Set(discovered.map((calendar) => calendar.id))
  const keptRead = draft.readIds.filter((id) => ids.has(id))
  const readIds = keptRead.length > 0 ? keptRead : discovered.filter((calendar) => calendar.selected).map((calendar) => calendar.id)
  const writable = discovered.filter((calendar) => calendar.canWrite)
  const keptWrite = writable.find((calendar) => calendar.id === draft.writeId)
  const writeId = (keptWrite ?? writable.find((calendar) => calendar.primary) ?? writable[0])?.id ?? null
  return {
    ...draft,
    readIds,
    writeId,
    known: discovered.map(({ id, name, canWrite }) => ({ id, name, canWrite })),
  }
}

/** What is stored: nothing at all when the credentials were cleared. */
export function googleSettingsFromDraft(draft: GoogleDraft): Pick<Settings, 'google' | 'calendars'> {
  if (isGoogleDraftEmpty(draft)) return { google: null, calendars: { readIds: [], writeId: null, known: [] } }
  return {
    google: { clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim(), refreshToken: draft.refreshToken.trim() },
    calendars: { readIds: draft.readIds, writeId: draft.writeId, known: draft.known },
  }
}
