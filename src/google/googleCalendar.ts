import { z } from 'zod'
import { placeOnSeriesStart } from '../calendar/seriesShift'
import type { CalendarEvent, CalendarEventInput, CalendarPort, DateRange, Recurrence, RecurrenceScope, SeriesPort } from '../calendar/types'
import { UserFacingError } from '../shared/userFacingError'
import { applyEventInput, googleEventSchema, splitId, toCalendarEvent } from './eventMapping'
import { GoogleApiError, type GoogleApi } from './googleApi'
import { parseRuleLines } from './recurrenceRule'

const MAX_PAGE_SIZE = '2500'
const GONE = 410

const eventPageSchema = z.object({ items: z.array(googleEventSchema).default([]), nextPageToken: z.string().optional() })

interface GoogleCalendarOptions {
  api: GoogleApi
  readIds: readonly string[]
  writeId: string | null
}

const eventPath = (calendarId: string, eventId: string) => `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`

/** The Google Calendar implementation of the calendar port. */
export function createGoogleCalendar({ api, readIds, writeId }: GoogleCalendarOptions): CalendarPort {
  async function listCalendar(calendarId: string, { from, to }: DateRange): Promise<CalendarEvent[]> {
    const events: CalendarEvent[] = []
    let pageToken: string | undefined
    do {
      const page = await api.getJson(`/calendars/${encodeURIComponent(calendarId)}/events`, eventPageSchema, {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: MAX_PAGE_SIZE,
        ...(pageToken === undefined ? {} : { pageToken }),
      })
      for (const raw of page.items) {
        const event = toCalendarEvent(calendarId, raw)
        if (event !== null) events.push(event)
      }
      pageToken = page.nextPageToken
    } while (pageToken !== undefined)
    return events
  }

  // The series is a separate "master" event; an occurrence only knows its id (`recurringEventId`). The editor offers the series
  // only for occurrences, so it is always set.
  const masterOf = (occurrence: CalendarEvent) => {
    const { calendarId, eventId } = splitId(occurrence.recurringEventId!)
    return { calendarId, path: eventPath(calendarId, eventId) }
  }

  const series: SeriesPort = {
    loadRule: async (occurrence) => parseRuleLines((await api.getJson(masterOf(occurrence).path, googleEventSchema)).recurrence ?? []),

    update: async (occurrence, input, keepRule) => {
      const { calendarId, path } = masterOf(occurrence)
      const master = await api.getJson(path, googleEventSchema)
      const current = toCalendarEvent(calendarId, master)!
      const placed = { ...input, ...placeOnSeriesStart(current.start, input) }
      await api.sendJson('PUT', path, applyEventInput(master, placed, keepRule ? 'keep' : undefined), googleEventSchema)
    },
  }

  return {
    series,

    listEvents: async (range) => (await Promise.all(readIds.map((calendarId) => listCalendar(calendarId, range)))).flat(),

    createEvent: async (input: CalendarEventInput) => {
      if (writeId === null) throw new UserFacingError('Wybierz kalendarz do zapisu w ustawieniach.')
      const created = await api.sendJson('POST', `/calendars/${encodeURIComponent(writeId)}/events`, applyEventInput(undefined, input), googleEventSchema)
      return toCalendarEvent(writeId, created)!
    },

    updateEvent: async (event: CalendarEvent, recurrence?: Recurrence) => {
      const { calendarId, eventId } = splitId(event.id)
      const path = eventPath(calendarId, eventId)
      const current = await api.getJson(path, googleEventSchema)
      await api.sendJson('PUT', path, applyEventInput(current, { ...event, recurrence }), googleEventSchema)
    },

    deleteEvent: async (event: CalendarEvent, scope: RecurrenceScope) => {
      const target = splitId(scope === 'series' && event.recurringEventId !== undefined ? event.recurringEventId : event.id)
      try {
        await api.remove(eventPath(target.calendarId, target.eventId))
      } catch (error) {
        if (!(error instanceof GoogleApiError && error.status === GONE)) throw error
      }
    },
  }
}

