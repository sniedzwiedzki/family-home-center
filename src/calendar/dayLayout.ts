import type { CalendarColumn } from './columns'
import type { DayEntry } from './days'
import type { CalendarEvent } from './types'

/**
 * Whether a chip shows a time line above its title: timed events on their first day, and the last day of an event that ends
 * during it ("ciąg dalszy"). A following day the event covers fully shows only the title.
 */
export const hasTimeLine = ({ event, isContinuation, endsThisDay = false }: DayEntry): boolean => (isContinuation ? endsThisDay : !event.allDay)

/** The entries of a day by column id, each in the one column `columnOf` gives it, in the order they came. */
export function layoutDayEntries(entries: readonly DayEntry[], columns: readonly CalendarColumn[], columnOf: (event: CalendarEvent) => string): ReadonlyMap<string, DayEntry[]> {
  const cells = new Map<string, DayEntry[]>(columns.map((column) => [column.id, []]))
  for (const entry of entries) cells.get(columnOf(entry.event))!.push(entry)
  return cells
}
