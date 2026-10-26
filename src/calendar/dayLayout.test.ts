import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns } from './columns'
import { layoutDayEntries } from './dayLayout'
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
const ids = (entries: DayEntry[]) => entries.map(({ event }) => event.id)

describe('layoutDayEntries', () => {
  it('keeps events of one person in that person\'s cell and the rest in "Inne"', () => {
    const { bands, laneCount, cellEntries } = layout(entry('1', 'Trening #anna'), entry('2', 'Śmieci'))
    expect(bands).toEqual([])
    expect(laneCount).toBe(0)
    expect(ids(cellEntries.get('a')!)).toEqual(['1'])
    expect(ids(cellEntries.get('other')!)).toEqual(['2'])
    expect(cellEntries.get('j')).toEqual([])
  })

  it('draws an event of neighbouring people once, across their columns', () => {
    const { bands, laneCount, cellEntries } = layout(entry('1', 'Kino #jan #anna #tomek'))
    expect(bands).toEqual([{ entry: entry('1', 'Kino #jan #anna #tomek'), firstColumn: 0, columnCount: 3, lane: 0 }])
    expect(laneCount).toBe(1)
    expect([...cellEntries.values()].flat()).toEqual([])
  })

  it('does not cover a person who is not taking part: people with a gap keep their own chips', () => {
    const { bands, cellEntries } = layout(entry('1', 'Kino #anna #tomek'))
    expect(bands).toEqual([])
    expect(ids(cellEntries.get('a')!)).toEqual(['1'])
    expect(ids(cellEntries.get('t')!)).toEqual(['1'])
    expect(cellEntries.get('j')).toEqual([])
  })

  it('makes a band of the neighbours and a chip of the person left over', () => {
    const { bands, cellEntries } = layout(entry('1', 'Kino #anna #jan #ola'))
    expect(bands.map(({ firstColumn, columnCount }) => [firstColumn, columnCount])).toEqual([[0, 2]])
    expect(ids(cellEntries.get('o')!)).toEqual(['1'])
  })

  it('puts bands that share a column one above the other, and bands that do not on the same lane', () => {
    const { bands, laneCount } = layout(entry('1', 'A #anna #jan'), entry('2', 'B #jan #tomek'), entry('3', 'C #tomek #ola'))
    expect(bands.map(({ entry: { event }, lane }) => [event.id, lane])).toEqual([
      ['1', 0],
      ['3', 0],
      ['2', 1],
    ])
    expect(laneCount).toBe(2)
  })
})
