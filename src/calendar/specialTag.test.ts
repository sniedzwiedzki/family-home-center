import { describe, expect, it } from 'vitest'
import { DEFAULT_SPECIAL_TAG, isSpecialEvent } from './specialTag'

describe('isSpecialEvent', () => {
  it('is true for the tag typed in the title or kept in the hidden property, in any letter case', () => {
    expect(isSpecialEvent({ title: 'Urodziny #STAR' }, DEFAULT_SPECIAL_TAG)).toBe(true)
    expect(isSpecialEvent({ title: 'Urodziny', extendedProperties: { private: { fhcTags: 'anna,star' } } }, DEFAULT_SPECIAL_TAG)).toBe(true)
  })

  it('is false without the tag, and for the default tag when another one is set', () => {
    expect(isSpecialEvent({ title: 'Urodziny #anna' }, DEFAULT_SPECIAL_TAG)).toBe(false)
    expect(isSpecialEvent({ title: 'Urodziny #star' }, 'gwiazda')).toBe(false)
    expect(isSpecialEvent({ title: 'Urodziny #gwiazda' }, 'gwiazda')).toBe(true)
  })
})
