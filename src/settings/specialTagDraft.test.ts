import { describe, expect, it } from 'vitest'
import { SPECIAL_TAG_DUPLICATE_ERROR, specialTagError } from './specialTagDraft'

describe('specialTagError', () => {
  it('accepts a valid tag, whatever its case and spaces', () => {
    expect(specialTagError('star', ['anna'])).toBeNull()
    expect(specialTagError(' Gwiazda ', [])).toBeNull()
  })

  it.each(['', 'two words', 'a'.repeat(21)])('rejects "%s"', (draft) => {
    expect(specialTagError(draft, [])).toBe('Tag: litery, cyfry, _ lub - (do 20 znaków)')
  })

  it('rejects the tag of a person', () => {
    expect(specialTagError('Anna', ['jan', ' ANNA '])).toBe(SPECIAL_TAG_DUPLICATE_ERROR)
  })
})
