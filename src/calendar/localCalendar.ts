import { z } from 'zod'
import type { CalendarEvent, CalendarEventInput, CalendarPort, DateRange } from './types'

export const EVENTS_STORAGE_KEY = 'fhc.events.v1'

const storedEventSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  allDay: z.boolean(),
  start: z.coerce.date(),
  end: z.coerce.date(),
  extendedProperties: z.object({ private: z.record(z.string(), z.string()).optional() }).optional(),
})

type EventStorage = Pick<Storage, 'getItem' | 'setItem'>

function readEvents(storage: EventStorage): CalendarEvent[] {
  const raw = storage.getItem(EVENTS_STORAGE_KEY)
  if (raw === null) return []
  try {
    const parsed = z.array(storedEventSchema).safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch (error) {
    console.error('Stored events are not valid JSON; starting empty', error)
    return []
  }
}

const writeEvents = (storage: EventStorage, events: readonly CalendarEvent[]) =>
  storage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events))

/** Keeps events in the browser's local storage, until the Google Calendar client replaces it. */
export function createLocalCalendar(storage: EventStorage): CalendarPort {
  return {
    listEvents: async ({ from, to }: DateRange) => readEvents(storage).filter((event) => event.start < to && event.end > from),

    createEvent: async (input: CalendarEventInput) => {
      const event = { ...input, id: crypto.randomUUID() }
      writeEvents(storage, [...readEvents(storage), event])
      return event
    },

    updateEvent: async (event: CalendarEvent) => {
      const events = readEvents(storage)
      if (!events.some((stored) => stored.id === event.id)) throw new Error(`Event ${event.id} does not exist`)
      writeEvents(storage, events.map((stored) => (stored.id === event.id ? event : stored)))
    },

    deleteEvent: async (target: CalendarEvent) => {
      writeEvents(storage, readEvents(storage).filter((event) => event.id !== target.id))
    },
  }
}
