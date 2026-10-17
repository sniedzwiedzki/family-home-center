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
      entries.push({ event, isContinuation: index > 0 })
      groups.set(key, entries)
    })
  }
  for (const entries of groups.values()) entries.sort(compareEntries)
  return groups
}

export type DayKind = 'weekday' | 'saturday' | 'sunday'

export function dayKind(date: Date): DayKind {
  const weekday = date.getDay()
  return weekday === 6 ? 'saturday' : weekday === 0 ? 'sunday' : 'weekday'
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
