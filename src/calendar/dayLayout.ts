import type { FamilyMember } from '../family/familyMember'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import type { DayEntry } from './days'

/** One event of several neighbouring people, drawn once across all of their columns. */
export interface SharedBand {
  entry: DayEntry
  /** Index in the columns list. */
  firstColumn: number
  columnCount: number
  /** Bands that overlap in columns sit in different lanes, one above the other. */
  lane: number
}

export interface DayLayout {
  bands: SharedBand[]
  laneCount: number
  /** What stays in each column's own cell, by column id. */
  cellEntries: ReadonlyMap<string, DayEntry[]>
}

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
 * An event shown in several neighbouring columns becomes one band across them. People who are not neighbours (someone
 * between them is not taking part) keep their own chip, so a band never covers a column of someone who is not involved.
 */
export function layoutDayEntries(entries: readonly DayEntry[], columns: readonly CalendarColumn[], members: readonly FamilyMember[]): DayLayout {
  const indexById = new Map(columns.map((column, index) => [column.id, index]))
  const cellEntries = new Map(columns.map((column) => [column.id, [] as DayEntry[]]))
  const lanes: SharedBand[][] = []

  for (const entry of entries) {
    const indexes = columnIdsForEvent(entry.event, members).map((id) => indexById.get(id)!).sort((a, b) => a - b)
    for (const run of neighbouringRuns(indexes)) {
      if (run.length === 1) {
        cellEntries.get(columns[run[0]].id)!.push(entry)
        continue
      }
      const firstColumn = run[0]
      const columnCount = run.length
      const overlaps = (band: SharedBand) => band.firstColumn < firstColumn + columnCount && firstColumn < band.firstColumn + band.columnCount
      let lane = lanes.findIndex((bands) => !bands.some(overlaps))
      if (lane === -1) lane = lanes.push([]) - 1
      lanes[lane].push({ entry, firstColumn, columnCount, lane })
    }
  }

  return { bands: lanes.flat(), laneCount: lanes.length, cellEntries }
}
