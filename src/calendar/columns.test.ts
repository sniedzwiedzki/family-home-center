import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns, chipColors, columnForEvent, columnLayoutSchema, DEFAULT_COLUMN_LAYOUT, frequentSeries } from './columns'
import type { CalendarEvent } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]
const DAY_MS = 24 * 60 * 60 * 1000
const event = (title: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: title,
  title,
  allDay: false,
  start: new Date(2026, 9, 17, 9),
  end: new Date(2026, 9, 17, 10),
  ...extra,
})
const occurrence = (series: string, dayOffset: number): CalendarEvent =>
  event(`${series}-${dayOffset}`, { recurringEventId: series, start: new Date(new Date(2026, 9, 1).getTime() + dayOffset * DAY_MS) })

describe('buildColumns', () => {
  it('has the four columns left to right with the widths of the layout', () => {
    expect(buildColumns(DEFAULT_COLUMN_LAYOUT)).toEqual([
      { id: 'all', width: 3 },
      { id: 'recurring', width: 2 },
      { id: 'work', width: 1.5 },
      { id: 'other', width: 1.5 },
    ])
  })
})

describe('columnLayoutSchema', () => {
  it('accepts widths from 0.5 to 10 and a tag', () => {
    expect(columnLayoutSchema.safeParse(DEFAULT_COLUMN_LAYOUT).success).toBe(true)
    expect(columnLayoutSchema.safeParse({ ...DEFAULT_COLUMN_LAYOUT, widths: { ...DEFAULT_COLUMN_LAYOUT.widths, all: 0.25 } }).success).toBe(false)
    expect(columnLayoutSchema.safeParse({ ...DEFAULT_COLUMN_LAYOUT, workTag: '' }).success).toBe(false)
  })
})

describe('frequentSeries', () => {
  it('finds the series with two occurrences at most a week apart, not monthly ones or single events', () => {
    const events = [occurrence('weekly', 0), occurrence('weekly', 7), occurrence('daily', 3), occurrence('daily', 4), occurrence('monthly', 0), occurrence('monthly', 31), occurrence('once', 2), event('plain')]
    expect([...frequentSeries(events)].sort()).toEqual(['daily', 'weekly'])
  })

  it('compares occurrences in time order, whatever order they arrive in', () => {
    expect([...frequentSeries([occurrence('weekly', 14), occurrence('weekly', 0), occurrence('weekly', 7)])]).toEqual(['weekly'])
  })
})

describe('columnForEvent', () => {
  const frequent = new Set(['weekly'])
  const columnOf = (item: CalendarEvent) => columnForEvent(item, members, 'praca', frequent)

  it('puts an event of nobody in the family in "Inne"', () => {
    expect(columnOf(event('Śmieci'))).toBe('other')
  })

  it('puts a work event in "Praca", with or without a person', () => {
    expect(columnOf(event('Spotkanie #anna #praca'))).toBe('work')
    expect(columnOf(event('Spotkanie #praca'))).toBe('work')
  })

  it('puts a family event of a daily or weekly series in "Powtarzalne", and other family events in "Wszystkie"', () => {
    expect(columnOf({ ...occurrence('weekly', 0), title: 'Basen #jan' })).toBe('recurring')
    expect(columnOf({ ...occurrence('monthly', 0), title: 'Urodziny #jan' })).toBe('all')
    expect(columnOf(event('Kino #anna #jan'))).toBe('all')
  })

  it('keeps a series of nobody in the family in "Inne"', () => {
    expect(columnOf({ ...occurrence('weekly', 0), title: 'Wywóz śmieci' })).toBe('other')
  })
})

describe('chipColors', () => {
  it('gives one person\'s colour, stripes of several people\'s colours in the members\' order, or none', () => {
    expect(chipColors(event('Basen #jan'), members)).toEqual({ color: '#00ff00' })
    expect(chipColors(event('Kino #jan #anna'), members)).toEqual({ color: null, sharedColors: ['#ff0000', '#00ff00'] })
    expect(chipColors(event('Śmieci'), members)).toEqual({ color: null })
  })
})
