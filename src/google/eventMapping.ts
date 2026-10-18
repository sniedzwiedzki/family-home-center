import { z } from 'zod'
import { dayKey, startOfDay } from '../calendar/days'
import { EVENT_TAGS_PROPERTY } from '../calendar/tags'
import type { CalendarEvent, CalendarEventInput } from '../calendar/types'

const ID_SEPARATOR = '|'

const timeSchema = z.object({ date: z.string().optional(), dateTime: z.string().optional() }).loose()

/** The parts of a Google event the app reads; everything else is kept as it is so a PUT does not lose it. */
export const googleEventSchema = z
  .object({
    id: z.string(),
    status: z.string().optional(),
    summary: z.string().optional(),
    description: z.string().optional(),
    start: timeSchema,
    end: timeSchema,
    recurringEventId: z.string().optional(),
    extendedProperties: z.object({ private: z.record(z.string(), z.string()).optional() }).loose().optional(),
  })
  .loose()

export type GoogleEvent = z.infer<typeof googleEventSchema>

export const joinId = (calendarId: string, eventId: string): string => `${calendarId}${ID_SEPARATOR}${eventId}`

export function splitId(id: string): { calendarId: string; eventId: string } {
  const at = id.indexOf(ID_SEPARATOR)
  return { calendarId: id.slice(0, at), eventId: id.slice(at + 1) }
}

function parseDay(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** Null for events the app cannot show (cancelled, or without a start or end). */
export function toCalendarEvent(calendarId: string, raw: GoogleEvent): CalendarEvent | null {
  if (raw.status === 'cancelled') return null
  const allDay = raw.start.date !== undefined
  const start = allDay ? raw.start.date : raw.start.dateTime
  const end = allDay ? raw.end.date : raw.end.dateTime
  if (start === undefined || end === undefined) return null
  return {
    id: joinId(calendarId, raw.id),
    title: raw.summary ?? '',
    ...(raw.description === undefined ? {} : { description: raw.description }),
    allDay,
    start: allDay ? parseDay(start) : new Date(start),
    end: allDay ? parseDay(end) : new Date(end),
    ...(raw.recurringEventId === undefined ? {} : { recurringEventId: joinId(calendarId, raw.recurringEventId) }),
    ...(raw.extendedProperties?.private === undefined ? {} : { extendedProperties: { private: raw.extendedProperties.private } }),
  }
}

const timePart = (date: Date, allDay: boolean) =>
  allDay
    ? { date: dayKey(startOfDay(date)) }
    : { dateTime: date.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }

/** Builds the event resource to send: the existing resource (if any) with the fields the app owns replaced. */
export function applyEventInput(existing: GoogleEvent | undefined, input: CalendarEventInput): Record<string, unknown> {
  const body: Record<string, unknown> = { ...existing, summary: input.title, start: timePart(input.start, input.allDay), end: timePart(input.end, input.allDay) }
  if (input.description === undefined) delete body.description
  else body.description = input.description

  const { [EVENT_TAGS_PROPERTY]: _previousTags, ...otherProperties } = existing?.extendedProperties?.private ?? {}
  const privateProperties = { ...otherProperties, ...input.extendedProperties?.private }
  if (Object.keys(privateProperties).length > 0 || existing?.extendedProperties !== undefined) {
    body.extendedProperties = { ...existing?.extendedProperties, private: privateProperties }
  }
  return body
}
