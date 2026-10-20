import { addDays, startOfDay } from './days'
import type { CalendarEventInput } from './types'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole calendar days between two instants; rounding absorbs the hour a daylight saving change adds or removes. */
const daysBetween = (from: Date, to: Date): number => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)

/**
 * The times of an edited occurrence applied to the first day of its series: the series keeps its start date, takes the time of day
 * and the length of the edited occurrence. All-day events keep their length in days.
 */
export function placeOnSeriesStart(seriesStart: Date, input: CalendarEventInput): { start: Date; end: Date } {
  const firstDay = startOfDay(seriesStart)
  const lastDay = addDays(firstDay, daysBetween(input.start, input.end))
  if (input.allDay) return { start: firstDay, end: lastDay }
  const at = (day: Date, time: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.getHours(), time.getMinutes())
  return { start: at(firstDay, input.start), end: at(lastDay, input.end) }
}
