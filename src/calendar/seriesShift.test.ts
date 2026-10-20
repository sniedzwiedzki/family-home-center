import { describe, expect, it } from 'vitest'
import { placeOnSeriesStart } from './seriesShift'
import type { CalendarEventInput } from './types'

const timed = (start: Date, end: Date): CalendarEventInput => ({ title: 'x', allDay: false, start, end })

describe('placeOnSeriesStart', () => {
  it('moves the time of day of the edited occurrence onto the first day of the series', () => {
    const placed = placeOnSeriesStart(new Date(2026, 8, 7, 9, 0), timed(new Date(2026, 9, 20, 15, 30), new Date(2026, 9, 20, 16, 45)))
    expect(placed).toEqual({ start: new Date(2026, 8, 7, 15, 30), end: new Date(2026, 8, 7, 16, 45) })
  })

  it('keeps an occurrence that runs past midnight running past midnight', () => {
    const placed = placeOnSeriesStart(new Date(2026, 8, 7, 9, 0), timed(new Date(2026, 9, 20, 22, 0), new Date(2026, 9, 21, 1, 0)))
    expect(placed).toEqual({ start: new Date(2026, 8, 7, 22, 0), end: new Date(2026, 8, 8, 1, 0) })
  })

  it('keeps the length in days of an all-day event, across a daylight saving change', () => {
    const input: CalendarEventInput = { title: 'x', allDay: true, start: new Date(2026, 9, 24), end: new Date(2026, 9, 27) }
    expect(placeOnSeriesStart(new Date(2026, 8, 7, 9, 0), input)).toEqual({ start: new Date(2026, 8, 7), end: new Date(2026, 8, 10) })
  })
})
