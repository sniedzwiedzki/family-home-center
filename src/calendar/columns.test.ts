import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns, columnIdsForEvent, OTHER_COLUMN_ID } from './columns'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

describe('buildColumns', () => {
  it('returns only the fixed "Inne" column when there are no members', () => {
    expect(buildColumns([])).toEqual([{ id: OTHER_COLUMN_ID, name: 'Inne', color: null, tag: null }])
  })

  it('puts one column per member before the fixed "Inne" column', () => {
    const columns = buildColumns(members)
    expect(columns.map((column) => column.id)).toEqual(['a', 'j', OTHER_COLUMN_ID])
    expect(columns[0]).toEqual({ id: 'a', name: 'Anna', color: '#ff0000', tag: 'anna' })
  })
})

describe('columnIdsForEvent', () => {
  it('maps a tagged event to the member column', () => {
    expect(columnIdsForEvent({ title: 'Dentysta #anna' }, members)).toEqual(['a'])
  })

  it('shows an event with several tags in every matching column', () => {
    expect(columnIdsForEvent({ title: 'Kino #jan #anna' }, members)).toEqual(['a', 'j'])
  })

  it('puts events without a known tag in "Inne"', () => {
    expect(columnIdsForEvent({ title: 'Śmieci' }, members)).toEqual([OTHER_COLUMN_ID])
    expect(columnIdsForEvent({ title: 'Kino #nikt' }, members)).toEqual([OTHER_COLUMN_ID])
  })
})
