import type { CalendarEvent } from './types'

export const startOfDay = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)

const pad = (value: number): string => String(value).padStart(2, '0')

export const dayKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export function daysInRange(from: Date, to: Date): Date[] {
  const days: Date[] = []
  for (let day = startOfDay(from); day < to; day = addDays(day, 1)) days.push(day)
  return days
}

export interface DayEntry {
  event: CalendarEvent
  isContinuation: boolean
  /** The event ends during this day, before the next midnight. Left out, it runs to the end of the day. */
  endsThisDay?: boolean
}

function coveredDays(event: CalendarEvent): Date[] {
  const lastInstant = event.end > event.start ? new Date(event.end.getTime() - 1) : event.start
  return daysInRange(event.start, addDays(startOfDay(lastInstant), 1))
}

const compareEntries = (a: DayEntry, b: DayEntry): number =>
  Number(b.event.allDay) - Number(a.event.allDay) ||
  a.event.start.getTime() - b.event.start.getTime() ||
  a.event.title.localeCompare(b.event.title, 'pl')

export function groupEventsByDay(events: readonly CalendarEvent[]): Map<string, DayEntry[]> {
  const groups = new Map<string, DayEntry[]>()
  for (const event of events) {
    coveredDays(event).forEach((day, index) => {
      const key = dayKey(day)
      const entries = groups.get(key) ?? []
      entries.push({ event, isContinuation: index > 0, endsThisDay: event.end < addDays(day, 1) })
      groups.set(key, entries)
    })
  }
  for (const entries of groups.values()) entries.sort(compareEntries)
  return groups
}

export type DayKind = 'weekday' | 'saturday' | 'sunday'

// Fixed-date public holidays in Poland as [month (1-12), day]; Christmas Eve is a holiday since 2025.
const FIXED_HOLIDAYS: readonly (readonly [number, number])[] = [
  [1, 1],
  [1, 6],
  [5, 1],
  [5, 3],
  [8, 15],
  [11, 1],
  [11, 11],
  [12, 24],
  [12, 25],
  [12, 26],
]

// Holidays that move with Easter Sunday: Easter Monday, Pentecost and Corpus Christi.
const EASTER_OFFSETS: readonly number[] = [1, 49, 60]

/** Easter Sunday of the given year (Gregorian calendar, Meeus/Jones/Butcher algorithm). */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const h = (b - Math.floor(b / 4) - Math.floor((b - Math.floor((b + 8) / 25) + 1) / 3) + 19 * a + 15) % 30
  const l = (32 + 2 * (b % 4) + 2 * Math.floor(c / 4) - h - (c % 4)) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day)
}

export function isPolishHoliday(date: Date): boolean {
  const month = date.getMonth() + 1
  const day = date.getDate()
  if (FIXED_HOLIDAYS.some(([m, d]) => m === month && d === day)) return true
  const easter = easterSunday(date.getFullYear())
  const key = dayKey(date)
  return EASTER_OFFSETS.some((offset) => dayKey(addDays(easter, offset)) === key)
}

/** Public holidays look like Sundays. */
export function dayKind(date: Date): DayKind {
  const weekday = date.getDay()
  if (weekday === 0 || isPolishHoliday(date)) return 'sunday'
  return weekday === 6 ? 'saturday' : 'weekday'
}

export interface MonthGroup {
  key: string
  days: Date[]
}

/** Splits consecutive days into calendar months, in order. */
export function groupDaysByMonth(days: readonly Date[]): MonthGroup[] {
  const groups: MonthGroup[] = []
  for (const day of days) {
    const key = dayKey(day).slice(0, 7)
    const last = groups.at(-1)
    if (last?.key === key) last.days.push(day)
    else groups.push({ key, days: [day] })
  }
  return groups
}
