import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns } from './columns'
import { hasTimeLine, layoutDayEntries, type CellItem } from './dayLayout'
import type { DayEntry } from './days'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
  { id: 't', name: 'Tomek', tag: 'tomek', color: '#0000ff' },
  { id: 'o', name: 'Ola', tag: 'ola', color: '#ffff00' },
]
const columns = buildColumns(members)
const day = new Date(2026, 9, 17)
const entry = (id: string, title: string): DayEntry => ({
  event: { id, title, allDay: true, start: day, end: new Date(2026, 9, 18) },
  isContinuation: false,
})
const layout = (...entries: DayEntry[]) => layoutDayEntries(entries, columns, members)
const summary = (items: CellItem[] | undefined) => items!.map((item) => `${item.kind}:${item.entry.event.id}`)

describe('layoutDayEntries', () => {
  it('has a cell for every column, with events of one person in that person\'s cell and the rest in "Inne"', () => {
    const cells = layout(entry('1', 'Trening #anna'), entry('2', 'Śmieci'))
    expect([...cells.keys()]).toEqual(['a', 'j', 't', 'o', 'other'])
    expect(summary(cells.get('a'))).toEqual(['entry:1'])
    expect(summary(cells.get('other'))).toEqual(['entry:2'])
    expect(cells.get('j')).toEqual([])
  })

  it('shows an event of neighbouring people as one chip in the first cell and a spacer in the others', () => {
    const cells = layout(entry('1', 'Kino #jan #anna #tomek'))
    expect(summary(cells.get('a'))).toEqual(['shared:1'])
    expect(summary(cells.get('j'))).toEqual(['spacer:1'])
    expect(summary(cells.get('t'))).toEqual(['spacer:1'])
    expect(cells.get('o')).toEqual([])
    expect(cells.get('a')![0]).toMatchObject({ colors: ['#ff0000', '#00ff00', '#0000ff'] })
    expect(cells.get('j')![0]).toMatchObject({ isLast: false })
    expect(cells.get('t')![0]).toMatchObject({ isLast: true })
  })

  it('puts the shared chip before the own events of a person', () => {
    const cells = layout(entry('1', 'Trening #anna'), entry('2', 'Kino #anna #jan'), entry('3', 'Basen #jan'))
    expect(summary(cells.get('a'))).toEqual(['shared:2', 'entry:1'])
    expect(summary(cells.get('j'))).toEqual(['spacer:2', 'entry:3'])
  })

  it('does not join people who are not neighbours: each keeps a chip and nobody in between is covered', () => {
    const cells = layout(entry('1', 'Kino #anna #tomek'))
    expect(summary(cells.get('a'))).toEqual(['entry:1'])
    expect(summary(cells.get('t'))).toEqual(['entry:1'])
    expect(cells.get('j')).toEqual([])
  })

  it('joins the neighbours and leaves the person apart as a chip of their own', () => {
    const cells = layout(entry('1', 'Kino #anna #jan #ola'))
    expect(summary(cells.get('a'))).toEqual(['shared:1'])
    expect(summary(cells.get('j'))).toEqual(['spacer:1'])
    expect(summary(cells.get('o'))).toEqual(['entry:1'])
  })

  it('lets one shared chip end in the column where the next one starts: each takes half of it', () => {
    const cells = layout(entry('1', 'A #anna #jan'), entry('2', 'B #jan #tomek'))
    expect(summary(cells.get('a'))).toEqual(['shared:1'])
    expect(summary(cells.get('j'))).toEqual(['spacer:1', 'shared:2'])
    expect(summary(cells.get('t'))).toEqual(['spacer:2'])
  })

  it('puts the end spacer before the chip that starts in the same column, whichever event comes first', () => {
    const cells = layout(entry('2', 'B #jan #tomek'), entry('1', 'A #anna #jan'))
    expect(summary(cells.get('j'))).toEqual(['spacer:1', 'shared:2'])
  })

  it('keeps a later event per person when it needs a half that an earlier shared chip already takes', () => {
    const cells = layout(entry('1', 'A #anna #jan #tomek'), entry('2', 'B #jan #tomek'))
    expect(summary(cells.get('j'))).toEqual(['spacer:1', 'entry:2'])
    expect(summary(cells.get('t'))).toEqual(['spacer:1', 'entry:2'])
  })

  it('makes a shared chip as tall as a timed chip when it or an own chip of an edge person has a time line', () => {
    const timed = (id: string, title: string): DayEntry => ({ ...entry(id, title), event: { ...entry(id, title).event, allDay: false } })
    const flag = (cells: ReadonlyMap<string, CellItem[]>, column: string) => cells.get(column)!.map((item) => item.kind !== 'entry' && item.hasTimeLine)
    expect(flag(layout(timed('1', 'A #anna #jan')), 'a')).toEqual([true])
    expect(flag(layout(entry('1', 'A #anna #jan')), 'j')).toEqual([false])
    expect(flag(layout(entry('1', 'A #anna #jan'), timed('2', 'B #jan')), 'j')).toEqual([true, false])
    // A middle person's chips sit below the chip, so they do not make it taller.
    expect(flag(layout(entry('1', 'A #anna #jan #tomek'), timed('2', 'B #jan')), 'a')).toEqual([false])
  })

  it('lets a two-person chip grow into the outer halves only when no other shared chip uses its columns', () => {
    const canWiden = (cells: ReadonlyMap<string, CellItem[]>, column: string) =>
      cells.get(column)!.flatMap((item) => (item.kind === 'shared' ? [item.canWiden] : []))
    expect(canWiden(layout(entry('1', 'A #anna #jan')), 'a')).toEqual([true])
    expect(canWiden(layout(entry('1', 'A #anna #jan #tomek')), 'a')).toEqual([false])
    const meeting = layout(entry('1', 'A #anna #jan'), entry('2', 'B #jan #tomek'))
    expect(canWiden(meeting, 'a')).toEqual([false])
    expect(canWiden(meeting, 'j')).toEqual([false])
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
