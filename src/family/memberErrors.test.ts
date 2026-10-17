import { describe, expect, it } from 'vitest'
import { hasErrors, memberErrors, type DraftMember } from './memberErrors'

const anna: DraftMember = { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }
const jan: DraftMember = { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' }

describe('memberErrors', () => {
  it('has no errors for valid members', () => {
    expect(memberErrors([anna, jan])).toEqual([{}, {}])
    expect(hasErrors(memberErrors([anna, jan]))).toBe(false)
  })

  it('has no errors for an empty list', () => {
    expect(memberErrors([])).toEqual([])
  })

  it('explains an invalid name, tag and color in Polish', () => {
    const [errors] = memberErrors([{ id: 'x', name: ' ', tag: 'a b', color: 'red' }])
    expect(errors.name).toBe('Podaj imię (do 30 znaków)')
    expect(errors.tag).toBe('Tag: litery, cyfry, _ lub - (do 20 znaków)')
    expect(errors.color).toBe('Wybierz kolor')
    expect(hasErrors([errors])).toBe(true)
  })

  it('flags the later of two duplicate tags regardless of case and spaces', () => {
    const errors = memberErrors([anna, { ...jan, tag: ' ANNA ' }])
    expect(errors[0]).toEqual({})
    expect(errors[1].tag).toBe('Tag musi być unikalny')
  })

  it('reports a format problem rather than a duplicate for empty tags', () => {
    const errors = memberErrors([{ ...anna, tag: '' }, { ...jan, tag: '' }])
    expect(errors[0].tag).toBe('Tag: litery, cyfry, _ lub - (do 20 znaków)')
    expect(errors[1].tag).toBe('Tag: litery, cyfry, _ lub - (do 20 znaków)')
  })
})
