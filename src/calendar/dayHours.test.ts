import { describe, expect, it } from 'vitest'
import { hourRange, isDayOver, isTimed, placeSpans, timedSpans } from './dayHours'
import type { DayEntry } from './days'

const day = new Date(2026, 9, 18)
const at = (hour: number, minute = 0) => new Date(2026, 9, 18, hour, minute)
const entry = (id: string, start: Date, end: Date, extra: Partial<DayEntry['event']> & { isContinuation?: boolean } = {}): DayEntry => {
  const { isContinuation = false, ...event } = extra
  return { event: { id, title: id, allDay: false, start, end, ...event }, isContinuation }
}

describe('isTimed', () => {
  it('is true only for a timed event on its first day', () => {
    expect(isTimed(entry('a', at(9), at(10)))).toBe(true)
    expect(isTimed(entry('a', at(9), at(10), { allDay: true }))).toBe(false)
    expect(isTimed(entry('a', at(9), at(10), { isContinuation: true }))).toBe(false)
  })
})

describe('timedSpans', () => {
  it('measures minutes since midnight and skips all-day events and continuations', () => {
    const spans = timedSpans(day, [entry('a', at(9, 15), at(10, 45)), entry('b', at(9), at(10), { allDay: true }), entry('c', at(9), at(10), { isContinuation: true })])
    expect(spans.map(({ entry: { event }, startMinute, endMinute }) => [event.id, startMinute, endMinute])).toEqual([['a', 555, 645]])
  })

  it('gives a very short event a readable height', () => {
    expect(timedSpans(day, [entry('a', at(9), at(9))])[0].endMinute).toBe(570)
  })

  it('stops an event that runs past midnight at the end of the day', () => {
    const spans = timedSpans(day, [entry('a', at(22), new Date(2026, 9, 19, 2)), entry('b', at(23, 50), at(23, 55))])
    expect(spans.map((span) => span.endMinute)).toEqual([1440, 1440])
  })

  it('starts an event that began before the day at midnight', () => {
    expect(timedSpans(day, [entry('a', new Date(2026, 9, 17, 22), at(1))])[0].startMinute).toBe(0)
  })
})

describe('hourRange', () => {
  it('is 7 to 20 without events', () => {
    expect(hourRange([])).toEqual({ startHour: 7, endHour: 20 })
  })

  it('keeps 7 to 20 for events inside it', () => {
    expect(hourRange(timedSpans(day, [entry('a', at(8), at(20))]))).toEqual({ startHour: 7, endHour: 20 })
  })

  it('shows more hours only for an event before 7 or after 20', () => {
    expect(hourRange(timedSpans(day, [entry('a', at(5, 30), at(6, 30))]))).toEqual({ startHour: 5, endHour: 20 })
    expect(hourRange(timedSpans(day, [entry('a', at(21), at(22, 15))]))).toEqual({ startHour: 7, endHour: 23 })
  })
})

describe('isDayOver', () => {
  it('is false during the usual hours and true from 20:00 on', () => {
    expect(isDayOver(at(7), [])).toBe(false)
    expect(isDayOver(at(19, 59), [])).toBe(false)
    expect(isDayOver(at(20), [])).toBe(true)
  })

  it('waits for the last event of the evening', () => {
    const late = [entry('a', at(21), at(22, 30))]
    expect(isDayOver(at(21, 30), late)).toBe(false)
    expect(isDayOver(at(22, 59), late)).toBe(false)
    expect(isDayOver(at(23), late)).toBe(true)
  })
})

describe('placeSpans', () => {
  const place = (...windows: [number, number][]) =>
    placeSpans(timedSpans(day, windows.map(([from, to], index) => entry(String(index), at(from), at(to))))).map(({ entry: { event }, lane, lanes }) => [event.id, lane, lanes])

  it('gives a lone event the whole width', () => {
    expect(place([9, 10])).toEqual([['0', 0, 1]])
  })

  it('puts overlapping events side by side', () => {
    expect(place([9, 11], [10, 12])).toEqual([['0', 0, 2], ['1', 1, 2]])
  })

  it('reuses a lane once its event is over and keeps the group width', () => {
    expect(place([9, 12], [9, 10], [10, 11])).toEqual([['0', 0, 2], ['1', 1, 2], ['2', 1, 2]])
  })

  it('does not widen later events that no longer overlap', () => {
    expect(place([9, 11], [10, 12], [12, 13])).toEqual([['0', 0, 2], ['1', 1, 2], ['2', 0, 1]])
  })

  it('is empty without events', () => {
    expect(placeSpans([])).toEqual([])
  })
})
