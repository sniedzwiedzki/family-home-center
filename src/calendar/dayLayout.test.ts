import { describe, expect, it } from 'vitest'
import { buildColumns, DEFAULT_COLUMN_LAYOUT } from './columns'
import { hasTimeLine, layoutDayEntries } from './dayLayout'
import type { DayEntry } from './days'

const columns = buildColumns(DEFAULT_COLUMN_LAYOUT)
const day = new Date(2026, 9, 17)
const entry = (id: string, title: string): DayEntry => ({
  event: { id, title, allDay: true, start: day, end: new Date(2026, 9, 18) },
  isContinuation: false,
})

describe('layoutDayEntries', () => {
  it('has a cell for every column and puts each entry in the column it is given, in order', () => {
    const columnOf = ({ title }: { title: string }) => (title.includes('#praca') ? 'work' : 'all')
    const cells = layoutDayEntries([entry('1', 'A'), entry('2', 'B #praca'), entry('3', 'C')], columns, columnOf)
    expect([...cells.keys()]).toEqual(['all', 'recurring', 'work', 'other'])
    expect(cells.get('all')!.map((item) => item.event.id)).toEqual(['1', '3'])
    expect(cells.get('work')!.map((item) => item.event.id)).toEqual(['2'])
    expect(cells.get('recurring')).toEqual([])
  })
})

describe('hasTimeLine', () => {
  const at = (hour: number) => new Date(2026, 9, 17, hour)
  const event = { id: '1', title: 'A', allDay: false, start: at(9), end: at(10) }

  it('is true for a timed event on its first day and false for an all-day event', () => {
    expect(hasTimeLine({ event, isContinuation: false })).toBe(true)
    expect(hasTimeLine({ event: { ...event, allDay: true }, isContinuation: false })).toBe(false)
  })

  it('is true on a following day only when the event ends during it', () => {
    expect(hasTimeLine({ event, isContinuation: true, endsThisDay: true })).toBe(true)
    expect(hasTimeLine({ event, isContinuation: true, endsThisDay: false })).toBe(false)
    expect(hasTimeLine({ event, isContinuation: true })).toBe(false)
  })
})
