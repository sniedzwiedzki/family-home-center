import { addDays, daysInRange, startOfDay } from './days'
import type { CalendarEvent, CalendarPort, DateRange } from './types'

const DAY_MS = 24 * 60 * 60 * 1000
const MAX_EVENT_SPAN_DAYS = 3

const dayNumber = (day: Date): number => Math.floor(Date.UTC(day.getFullYear(), day.getMonth(), day.getDate()) / DAY_MS)

const at = (day: Date, hour: number, minute = 0): Date =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute)

function eventsStartingOn(day: Date): CalendarEvent[] {
  const n = dayNumber(day)
  const events: CalendarEvent[] = []
  if (n % 3 === 0) {
    events.push({ id: `training-${n}`, title: 'Trening #anna', allDay: false, start: at(day, 17), end: at(day, 18) })
  }
  if (n % 4 === 1) {
    events.push({ id: `school-${n}`, title: 'Szkoła #jan', allDay: false, start: at(day, 8), end: at(day, 8, 45) })
  }
  if (n % 7 === 2) {
    events.push({ id: `trash-${n}`, title: 'Wywóz śmieci', allDay: true, start: day, end: addDays(day, 1) })
  }
  if (n % 10 === 5) {
    events.push({ id: `trip-${n}`, title: 'Wyjazd #anna #jan', allDay: true, start: day, end: addDays(day, MAX_EVENT_SPAN_DAYS) })
  }
  return events
}

/** Deterministic sample data, used until the Google Calendar client lands. */
export function createMockCalendar(): CalendarPort {
  return {
    listEvents: async ({ from, to }: DateRange) =>
      daysInRange(addDays(startOfDay(from), -MAX_EVENT_SPAN_DAYS), to)
        .flatMap(eventsStartingOn)
        .filter((event) => event.start < to && event.end > from),
  }
}
