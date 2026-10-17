import { describe, expect, it } from 'vitest'
import { addDays, dayKey, dayKind, daysInRange, groupDaysByMonth, groupEventsByDay, startOfDay } from './days'
import type { CalendarEvent } from './types'

const timed = (id: string, start: Date, end: Date, title = id): CalendarEvent => ({ id, title, allDay: false, start, end })
const allDay = (id: string, start: Date, end: Date, title = id): CalendarEvent => ({ id, title, allDay: true, start, end })

describe('date helpers', () => {
  it('startOfDay drops the time', () => {
    expect(startOfDay(new Date(2026, 9, 17, 15, 30))).toEqual(new Date(2026, 9, 17))
  })

  it('addDays moves by calendar days across month and DST boundaries', () => {
    expect(addDays(new Date(2026, 9, 31, 12), 1)).toEqual(new Date(2026, 10, 1))
    expect(addDays(new Date(2026, 9, 25, 12), 1)).toEqual(new Date(2026, 9, 26))
    expect(addDays(new Date(2026, 9, 17), -17)).toEqual(new Date(2026, 9, 0))
  })

  it('dayKey pads month and day', () => {
    expect(dayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })

  it('daysInRange lists whole days, end exclusive', () => {
    const days = daysInRange(new Date(2026, 9, 17, 13), new Date(2026, 9, 20))
    expect(days.map(dayKey)).toEqual(['2026-10-17', '2026-10-18', '2026-10-19'])
  })

  it('daysInRange is empty for an empty range', () => {
    expect(daysInRange(new Date(2026, 9, 17), new Date(2026, 9, 17))).toEqual([])
  })
})

describe('groupEventsByDay', () => {
  it('puts a single-day event on its day', () => {
    const groups = groupEventsByDay([timed('a', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 10))])
    expect([...groups.keys()]).toEqual(['2026-10-17'])
    expect(groups.get('2026-10-17')?.[0].isContinuation).toBe(false)
  })

  it('shows a multi-day all-day event on every covered day with continuation markers', () => {
    const groups = groupEventsByDay([allDay('trip', new Date(2026, 9, 17), new Date(2026, 9, 20))])
    expect([...groups.keys()]).toEqual(['2026-10-17', '2026-10-18', '2026-10-19'])
    expect([...groups.values()].map((entries) => entries[0].isContinuation)).toEqual([false, true, true])
  })

  it('keeps a timed event ending exactly at midnight on one day', () => {
    const groups = groupEventsByDay([timed('late', new Date(2026, 9, 17, 22), new Date(2026, 9, 18))])
    expect([...groups.keys()]).toEqual(['2026-10-17'])
  })

  it('spreads a timed event across midnight over two days', () => {
    const groups = groupEventsByDay([timed('night', new Date(2026, 9, 17, 22), new Date(2026, 9, 18, 2))])
    expect([...groups.keys()]).toEqual(['2026-10-17', '2026-10-18'])
  })

  it('places a zero-length event on its day', () => {
    const at = new Date(2026, 9, 17, 12)
    expect([...groupEventsByDay([timed('now', at, at)]).keys()]).toEqual(['2026-10-17'])
  })

  it('sorts all-day first, then by start time, then by title', () => {
    const day = new Date(2026, 9, 17)
    const groups = groupEventsByDay([
      timed('late', new Date(2026, 9, 17, 18), new Date(2026, 9, 17, 19)),
      timed('b', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 10), 'Żuraw'),
      timed('a', new Date(2026, 9, 17, 9), new Date(2026, 9, 17, 10), 'Ala'),
      allDay('whole', day, addDays(day, 1)),
    ])
    expect(groups.get('2026-10-17')?.map((entry) => entry.event.id)).toEqual(['whole', 'a', 'b', 'late'])
  })

  it('returns nothing for no events', () => {
    expect(groupEventsByDay([]).size).toBe(0)
  })
})

describe('dayKind', () => {
  it('tells Saturdays and Sundays apart from the other days', () => {
    const kinds = Array.from({ length: 7 }, (_, i) => dayKind(new Date(2026, 9, 12 + i)))
    expect(kinds).toEqual(['weekday', 'weekday', 'weekday', 'weekday', 'weekday', 'saturday', 'sunday'])
  })
})

describe('groupDaysByMonth', () => {
  it('splits days at month boundaries, keeping order', () => {
    const groups = groupDaysByMonth(daysInRange(new Date(2026, 9, 30), new Date(2026, 10, 3)))
    expect(groups.map((group) => [group.key, group.days.map((day) => day.getDate())])).toEqual([
      ['2026-10', [30, 31]],
      ['2026-11', [1, 2]],
    ])
  })

  it('separates the same month of different years', () => {
    const groups = groupDaysByMonth([new Date(2026, 0, 31), new Date(2027, 0, 1)])
    expect(groups.map((group) => group.key)).toEqual(['2026-01', '2027-01'])
  })

  it('returns nothing for no days', () => {
    expect(groupDaysByMonth([])).toEqual([])
  })
})
