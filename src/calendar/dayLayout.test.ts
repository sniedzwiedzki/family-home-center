import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns } from './columns'
import { layoutDayEntries, type CellItem } from './dayLayout'
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

  it('keeps a later event per person when it would overlap an earlier shared one in a column', () => {
    const cells = layout(entry('1', 'A #anna #jan'), entry('2', 'B #jan #tomek'))
    expect(summary(cells.get('a'))).toEqual(['shared:1'])
    expect(summary(cells.get('j'))).toEqual(['spacer:1', 'entry:2'])
    expect(summary(cells.get('t'))).toEqual(['entry:2'])
  })
})
