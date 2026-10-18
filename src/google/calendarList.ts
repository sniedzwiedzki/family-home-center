import { z } from 'zod'
import { createGoogleApi } from './googleApi'
import { createTokenProvider, type GoogleCredentials } from './tokenProvider'

const PAGE_SIZE = '250'

const calendarListSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string().optional(),
        summaryOverride: z.string().optional(),
        accessRole: z.string(),
        selected: z.boolean().optional(),
        primary: z.boolean().optional(),
      }),
    )
    .default([]),
  nextPageToken: z.string().optional(),
})

export interface DiscoveredCalendar {
  id: string
  name: string
  canWrite: boolean
  /** Google shows this calendar in its own calendar UI. */
  selected: boolean
  primary: boolean
}

interface ConnectionOptions {
  fetchImpl: typeof fetch
  tokenUrl: string
  calendarUrl: string
  now: () => number
}

/** Returns a check that signs in with the given credentials and lists the account's calendars. */
export function createConnectionCheck({ fetchImpl, tokenUrl, calendarUrl, now }: ConnectionOptions) {
  return async (credentials: GoogleCredentials): Promise<DiscoveredCalendar[]> => {
    const api = createGoogleApi({
      fetchImpl,
      baseUrl: calendarUrl,
      getAccessToken: createTokenProvider({ fetchImpl, tokenUrl, credentials, now }),
    })
    const calendars: DiscoveredCalendar[] = []
    let pageToken: string | undefined
    do {
      const page = await api.getJson('/users/me/calendarList', calendarListSchema, {
        minAccessRole: 'reader',
        maxResults: PAGE_SIZE,
        ...(pageToken === undefined ? {} : { pageToken }),
      })
      for (const entry of page.items) {
        calendars.push({
          id: entry.id,
          name: entry.summaryOverride ?? entry.summary ?? entry.id,
          canWrite: entry.accessRole === 'owner' || entry.accessRole === 'writer',
          selected: entry.selected === true,
          primary: entry.primary === true,
        })
      }
      pageToken = page.nextPageToken
    } while (pageToken !== undefined)
    return calendars
  }
}
