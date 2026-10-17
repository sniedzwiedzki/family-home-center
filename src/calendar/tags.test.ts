import { describe, expect, it } from 'vitest'
import { EVENT_TAGS_PROPERTY, extractTags } from './tags'

const withProperty = (value: string) => ({ title: 'Obiad', extendedProperties: { private: { [EVENT_TAGS_PROPERTY]: value } } })

describe('extractTags', () => {
  it('returns nothing for an untagged event', () => {
    expect(extractTags({ title: 'Obiad' })).toEqual([])
  })

  it('returns nothing when private properties hold no tags', () => {
    expect(extractTags({ title: 'Obiad', extendedProperties: { private: {} } })).toEqual([])
    expect(extractTags({ title: 'Obiad', extendedProperties: {} })).toEqual([])
  })

  it('reads comma separated tags from the hidden property', () => {
    expect(extractTags(withProperty('anna, Jan'))).toEqual(['anna', 'jan'])
  })

  it('reads #tags from the title', () => {
    expect(extractTags({ title: 'Dentysta #Anna #żaneta' })).toEqual(['anna', 'żaneta'])
  })

  it('merges both sources without duplicates', () => {
    expect(extractTags({ ...withProperty('anna'), title: 'Obiad #ANNA #jan' })).toEqual(['anna', 'jan'])
  })

  it('ignores empty entries', () => {
    expect(extractTags(withProperty(',, anna ,'))).toEqual(['anna'])
  })
})
