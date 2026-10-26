import { describe, expect, it } from 'vitest'
import { DEFAULT_FONT_SIZES, draftFromFontSizes, fontSizeRem, fontSizesDraftError, fontSizesFromDraft, fontSizesSchema } from './fontSizes'

const draft = draftFromFontSizes(DEFAULT_FONT_SIZES)

describe('fontSizesSchema', () => {
  it('accepts whole numbers inside the range', () => {
    expect(fontSizesSchema.safeParse({ eventTitle: 8, eventTime: 120, dayNumber: 41 }).success).toBe(true)
  })

  it.each([7, 121, 20.5])('rejects %s', (value) => {
    expect(fontSizesSchema.safeParse({ ...DEFAULT_FONT_SIZES, eventTitle: value }).success).toBe(false)
  })
})

describe('draft', () => {
  it('shows the sizes as text', () => {
    expect(draft).toEqual({ eventTitle: '20', eventTime: '16', dayNumber: '41' })
  })

  it('has no error for valid numbers and turns them back into numbers', () => {
    const edited = { ...draft, eventTitle: ' 24 ' }
    expect(fontSizesDraftError(edited)).toBeNull()
    expect(fontSizesFromDraft(edited)).toEqual({ ...DEFAULT_FONT_SIZES, eventTitle: 24 })
  })

  it.each(['', 'abc', '5', '500', '12.5'])('has an error for "%s"', (value) => {
    expect(fontSizesDraftError({ ...draft, dayNumber: value })).toBe('Podaj rozmiary czcionek jako liczby całkowite od 8 do 120.')
  })
})

describe('fontSizeRem', () => {
  it('converts px of the 1600 px display to rem', () => {
    expect(fontSizeRem(20)).toBe(1.25)
    expect(fontSizeRem(41)).toBe(2.5625)
  })
})
