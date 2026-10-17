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
