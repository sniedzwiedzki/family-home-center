import { describe, expect, it } from 'vitest'
import { createMockCalendar } from './mockCalendar'
import type { DateRange } from './types'

const range: DateRange = { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) }

describe('createMockCalendar', () => {
  it('returns every kind of sample event for a month', async () => {
    const events = await createMockCalendar().listEvents(range)
    const kinds = new Set(events.map((event) => event.id.split('-')[0]))
    expect(kinds).toEqual(new Set(['training', 'school', 'trash', 'trip']))
  })

  it('is deterministic', async () => {
    const calendar = createMockCalendar()
    expect(await calendar.listEvents(range)).toEqual(await calendar.listEvents(range))
  })

  it('returns only events overlapping the range', async () => {
    const events = await createMockCalendar().listEvents(range)
    expect(events.length).toBeGreaterThan(0)
    for (const event of events) {
      expect(event.start < range.to).toBe(true)
      expect(event.end > range.from).toBe(true)
    }
  })

  it('includes a multi-day event that started before the range', async () => {
    const calendar = createMockCalendar()
    const wide = await calendar.listEvents({ from: new Date(2026, 8, 1), to: new Date(2026, 11, 1) })
    const trip = wide.find((event) => event.id.startsWith('trip-'))!
    const from = new Date(trip.start.getFullYear(), trip.start.getMonth(), trip.start.getDate() + 1)
    const narrow = await calendar.listEvents({ from, to: new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1) })
    expect(narrow.map((event) => event.id)).toContain(trip.id)
  })

  it('returns nothing for an empty range far from any event start', async () => {
    const at = new Date(2026, 9, 17)
    expect(await createMockCalendar().listEvents({ from: at, to: at })).toEqual([])
  })
})
