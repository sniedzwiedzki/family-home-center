import type { FamilyMember } from '../family/familyMember'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import type { DayEntry } from './days'

/** What a column's cell shows, in order. */
export type CellItem =
  | { kind: 'entry'; entry: DayEntry }
  /** The first column of an event of several neighbouring people: one chip as wide as all their columns. */
  | { kind: 'shared'; entry: DayEntry; colors: string[] }
  /** The other columns of that event: an invisible copy of the chip that keeps its height free. */
  | { kind: 'spacer'; entry: DayEntry }

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

/**
 * Where each event goes, by column id. An event shown in several neighbouring columns is one chip over those columns,
 * in the same row as the cells (so the grid stays as it is). People who are not neighbours keep their own chips, so a
 * chip never covers someone who is not involved. A column carries at most one such chip: an event that would overlap
 * an earlier one stays per person.
 */
export function layoutDayEntries(entries: readonly DayEntry[], columns: readonly CalendarColumn[], members: readonly FamilyMember[]): ReadonlyMap<string, CellItem[]> {
  const indexById = new Map(columns.map((column, index) => [column.id, index]))
  const shared = new Map<string, CellItem>()
  const singles = new Map(columns.map((column) => [column.id, [] as CellItem[]]))

  for (const entry of entries) {
    const indexes = columnIdsForEvent(entry.event, members).map((id) => indexById.get(id)!).sort((a, b) => a - b)
    for (const run of neighbouringRuns(indexes)) {
      const runColumns = run.map((index) => columns[index])
      if (run.length > 1 && runColumns.every((column) => !shared.has(column.id))) {
        const colors = runColumns.map((column) => column.color!)
        runColumns.forEach((column, position) => shared.set(column.id, position === 0 ? { kind: 'shared', entry, colors } : { kind: 'spacer', entry }))
      } else {
        for (const column of runColumns) singles.get(column.id)!.push({ kind: 'entry', entry })
      }
    }
  }

  return new Map(
    columns.map((column) => {
      const band = shared.get(column.id)
      const own = singles.get(column.id)!
      return [column.id, band === undefined ? own : [band, ...own]]
    }),
  )
}
