import { z } from 'zod'
import { tagSchema, type FamilyMember } from '../family/familyMember'
import { extractTags, type TaggableEvent } from './tags'
import type { CalendarEvent } from './types'

export type ColumnId = 'all' | 'recurring' | 'work' | 'other'

const widthSchema = z.number().min(0.5).max(10)

/** How wide each column is (relative weights) and which tag sends an event to "Praca". */
export const columnLayoutSchema = z.object({
  widths: z.object({ all: widthSchema, recurring: widthSchema, work: widthSchema, other: widthSchema }),
  workTag: tagSchema,
})

export type ColumnLayout = z.infer<typeof columnLayoutSchema>

export const DEFAULT_COLUMN_LAYOUT: ColumnLayout = { widths: { all: 3, recurring: 2, work: 1.5, other: 1.5 }, workTag: 'praca' }

export interface CalendarColumn {
  id: ColumnId
  /** A relative weight (`fr`). */
  width: number
}

const COLUMN_ORDER: readonly ColumnId[] = ['all', 'recurring', 'work', 'other']

/** Left to right: Wszystkie (the rest of the family's events), Powtarzalne, Praca, Inne (events of nobody in the family). */
export function buildColumns(layout: ColumnLayout): CalendarColumn[] {
  return COLUMN_ORDER.map((id) => ({ id, width: layout.widths[id] }))
}

const FREQUENT_SERIES_MAX_GAP_MS = 7 * 24 * 60 * 60 * 1000

/**
 * The series that repeat daily or weekly: two of their loaded occurrences start at most a week apart. Occurrences carry no
 * rule (it lives on the series), so monthly and yearly series are told apart by their gaps.
 */
export function frequentSeries(events: readonly CalendarEvent[]): Set<string> {
  const starts = new Map<string, number[]>()
  for (const event of events) {
    if (event.recurringEventId === undefined) continue
    starts.set(event.recurringEventId, [...(starts.get(event.recurringEventId) ?? []), event.start.getTime()])
  }
  const frequent = new Set<string>()
  for (const [id, times] of starts) {
    const sorted = [...times].sort((a, b) => a - b)
    if (sorted.some((time, index) => index > 0 && time - sorted[index - 1] <= FREQUENT_SERIES_MAX_GAP_MS)) frequent.add(id)
  }
  return frequent
}

/** The one column an event goes to: the work tag → Praca; no family member → Inne; a daily or weekly series → Powtarzalne; else Wszystkie. */
export function columnForEvent(event: CalendarEvent, members: readonly FamilyMember[], workTag: string, frequent: ReadonlySet<string>): ColumnId {
  const tags = new Set(extractTags(event))
  if (tags.has(workTag)) return 'work'
  if (!members.some((member) => tags.has(member.tag))) return 'other'
  if (event.recurringEventId !== undefined && frequent.has(event.recurringEventId)) return 'recurring'
  return 'all'
}

/** A chip's colour: the person's own, stripes of every person's for several (in the order of the members), none for nobody. */
export function chipColors(event: TaggableEvent, members: readonly FamilyMember[]): { color: string | null; sharedColors?: string[] } {
  const tags = new Set(extractTags(event))
  const colors = members.filter((member) => tags.has(member.tag)).map((member) => member.color)
  return colors.length > 1 ? { color: null, sharedColors: colors } : { color: colors[0] ?? null }
}
