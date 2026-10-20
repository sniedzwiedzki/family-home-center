import { addDays, type DayEntry } from './days'

export const DEFAULT_START_HOUR = 7
export const DEFAULT_END_HOUR = 20
export const MINUTES_PER_HOUR = 60
/** The hour grid starts this long before the first shown hour, so the first hour label is not cramped against the top edge. */
export const LEADING_HOURS = 0.5
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR
// A shorter event is drawn this tall so its title stays readable and clickable.
const MIN_SPAN_MINUTES = 30

/** An entry drawn on the hour grid: not all-day and not the continuation of an earlier day. */
export const isTimed = ({ event, isContinuation }: DayEntry): boolean => !event.allDay && !isContinuation

export interface TimedSpan {
  entry: DayEntry
  /** Minutes since midnight of the day. */
  startMinute: number
  /** Minutes since midnight, at most 24 h: an event running past midnight stops at the end of the day. */
  endMinute: number
}

export interface PlacedSpan extends TimedSpan {
  lane: number
  lanes: number
}

export interface HourRange {
  startHour: number
  endHour: number
}

function minutesIntoDay(day: Date, instant: Date): number {
  if (instant < day) return 0
  if (instant >= addDays(day, 1)) return MINUTES_PER_DAY
  return instant.getHours() * MINUTES_PER_HOUR + instant.getMinutes()
}

export function timedSpans(day: Date, entries: readonly DayEntry[]): TimedSpan[] {
  return entries.filter(isTimed).map((entry) => {
    const startMinute = minutesIntoDay(day, entry.event.start)
    const endMinute = Math.min(MINUTES_PER_DAY, Math.max(minutesIntoDay(day, entry.event.end), startMinute + MIN_SPAN_MINUTES))
    return { entry, startMinute, endMinute }
  })
}

/** The usual hours, widened only as far as an event needs. */
export function hourRange(spans: readonly TimedSpan[]): HourRange {
  const earliest = Math.min(DEFAULT_START_HOUR * MINUTES_PER_HOUR, ...spans.map((span) => span.startMinute))
  const latest = Math.max(DEFAULT_END_HOUR * MINUTES_PER_HOUR, ...spans.map((span) => span.endMinute))
  return { startHour: Math.floor(earliest / MINUTES_PER_HOUR), endHour: Math.ceil(latest / MINUTES_PER_HOUR) }
}

/** True once the usual hours and every timed event of the day are behind `now`; `day` must be the day of `now`. */
export function isDayOver(now: Date, entries: readonly DayEntry[]): boolean {
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastMinute = hourRange(timedSpans(day, entries)).endHour * MINUTES_PER_HOUR
  return now.getHours() * MINUTES_PER_HOUR + now.getMinutes() >= lastMinute
}

/** Side-by-side lanes for events that overlap in time; each group of overlapping events shares the width. */
export function placeSpans(spans: readonly TimedSpan[]): PlacedSpan[] {
  const sorted = [...spans].sort((a, b) => a.startMinute - b.startMinute || b.endMinute - a.endMinute)
  const placed: PlacedSpan[] = []
  let group: PlacedSpan[] = []
  let laneEnds: number[] = []
  const closeGroup = () => {
    for (const span of group) span.lanes = laneEnds.length
    placed.push(...group)
    group = []
    laneEnds = []
  }
  for (const span of sorted) {
    if (group.length > 0 && span.startMinute >= Math.max(...laneEnds)) closeGroup()
    let lane = laneEnds.findIndex((end) => end <= span.startMinute)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = span.endMinute
    group.push({ ...span, lane, lanes: 0 })
  }
  closeGroup()
  return placed
}
