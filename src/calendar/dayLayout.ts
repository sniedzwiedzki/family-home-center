import type { FamilyMember } from '../family/familyMember'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import type { DayEntry } from './days'

/** What a column's cell shows, in order. */
export type CellItem =
  | { kind: 'entry'; entry: DayEntry }
  /**
   * The first column of an event of several neighbouring people: one chip over their columns. With `hasTimeLine` the chip is
   * as tall as a chip with a time line, so it matches the timed chips of the people beside it. With `canWiden` (two people,
   * no other band in either column) a long title may use the outer halves of both columns too.
   */
  | { kind: 'shared'; entry: DayEntry; colors: string[]; hasTimeLine: boolean; canWiden: boolean }
  /** The other columns of that event: an invisible copy of the chip that keeps its height free. The last one keeps only half. */
  | { kind: 'spacer'; entry: DayEntry; hasTimeLine: boolean; isLast: boolean }

/**
 * Whether a chip shows a time line above its title: timed events on their first day, and the last day of an event that ends
 * during it ("ciąg dalszy"). A following day the event covers fully shows only the title.
 */
export const hasTimeLine = ({ event, isContinuation, endsThisDay = false }: DayEntry): boolean => (isContinuation ? endsThisDay : !event.allDay)

/** Splits ascending column indexes into runs of neighbouring columns. */
function neighbouringRuns(indexes: readonly number[]): number[][] {
  const runs: number[][] = []
  for (const index of indexes) {
    const last = runs.at(-1)
    if (last?.at(-1) === index - 1) last.push(index)
    else runs.push([index])
  }
  return runs
}

/** A band takes the right half of its first column, the columns in between and the left half of its last column. */
function halvesOf(run: readonly CalendarColumn[]): string[] {
  return run.flatMap((column, position) => [
    ...(position > 0 ? [`${column.id}:left`] : []),
    ...(position < run.length - 1 ? [`${column.id}:right`] : []),
  ])
}

/**
 * Where each event goes, by column id. An event shown in several neighbouring columns is one chip over those columns,
 * in the same row as the cells (so the grid stays as it is). People who are not neighbours keep their own chips, so a
 * chip never covers someone who is not involved. Bands share columns by halves: one can end in the column where the next
 * starts. An event that would overlap an earlier band stays per person.
 */
export function layoutDayEntries(entries: readonly DayEntry[], columns: readonly CalendarColumn[], members: readonly FamilyMember[]): ReadonlyMap<string, CellItem[]> {
  const indexById = new Map(columns.map((column, index) => [column.id, index]))
  const bands: { entry: DayEntry; runColumns: CalendarColumn[] }[] = []
  const claimed = new Set<string>()
  const singles = new Map(columns.map((column) => [column.id, [] as CellItem[]]))

  for (const entry of entries) {
    const indexes = columnIdsForEvent(entry.event, members).map((id) => indexById.get(id)!).sort((a, b) => a - b)
    for (const run of neighbouringRuns(indexes)) {
      const runColumns = run.map((index) => columns[index])
      const halves = halvesOf(runColumns)
      if (run.length > 1 && halves.every((half) => !claimed.has(half))) {
        bands.push({ entry, runColumns })
        for (const half of halves) claimed.add(half)
      } else {
        for (const column of runColumns) singles.get(column.id)!.push({ kind: 'entry', entry })
      }
    }
  }

  const bandsIn = new Map<string, number>()
  for (const { runColumns } of bands) for (const column of runColumns) bandsIn.set(column.id, (bandsIn.get(column.id) ?? 0) + 1)

  const shared = new Map(columns.map((column) => [column.id, [] as CellItem[]]))
  for (const { entry, runColumns } of bands) {
    // Only the first and the last person of a run have own chips beside the band; the others' chips sit below it.
    const edges = [runColumns[0], runColumns.at(-1)!]
    const tall = hasTimeLine(entry) || edges.some((column) => singles.get(column.id)!.some((item) => hasTimeLine(item.entry)))
    const colors = runColumns.map((column) => column.color!)
    const canWiden = runColumns.length === 2 && edges.every((column) => bandsIn.get(column.id) === 1)
    runColumns.forEach((column, position) => {
      const items = shared.get(column.id)!
      // Where one band ends and the next starts, the end spacer comes first (the CSS lets the two meet there).
      if (position === 0) items.push({ kind: 'shared', entry, colors, hasTimeLine: tall, canWiden })
      else items.unshift({ kind: 'spacer', entry, hasTimeLine: tall, isLast: position === runColumns.length - 1 })
    })
  }

  return new Map(columns.map((column) => [column.id, [...shared.get(column.id)!, ...singles.get(column.id)!]]))
}
