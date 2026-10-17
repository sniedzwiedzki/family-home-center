import { describe, expect, it } from 'vitest'
import { familyMemberSchema, familyMembersSchema, normalizeTag } from './familyMember'

const anna = { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }
const jan = { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' }

describe('normalizeTag', () => {
  it('trims and lowercases', () => {
    expect(normalizeTag('  ANNa ')).toBe('anna')
  })
})

describe('familyMemberSchema', () => {
  it('accepts a valid member and normalizes the tag', () => {
    expect(familyMemberSchema.parse({ ...anna, tag: ' ANNA ' })).toEqual(anna)
  })

  it('accepts Polish letters in tags', () => {
    expect(familyMemberSchema.parse({ ...anna, tag: 'Żaneta' }).tag).toBe('żaneta')
  })

  it.each([
    ['empty name', { name: '   ' }],
    ['too long name', { name: 'x'.repeat(31) }],
    ['empty tag', { tag: '  ' }],
    ['tag with spaces', { tag: 'a b' }],
    ['tag with hash', { tag: '#anna' }],
    ['too long tag', { tag: 'x'.repeat(21) }],
    ['bad color', { color: 'red' }],
    ['empty id', { id: '' }],
  ])('rejects %s', (_label, override) => {
    expect(familyMemberSchema.safeParse({ ...anna, ...override }).success).toBe(false)
  })
})

describe('familyMembersSchema', () => {
  it('accepts members with unique ids and tags', () => {
    expect(familyMembersSchema.safeParse([anna, jan]).success).toBe(true)
  })

  it('rejects duplicate ids', () => {
    expect(familyMembersSchema.safeParse([anna, { ...jan, id: 'a' }]).success).toBe(false)
  })

  it('rejects duplicate tags regardless of case', () => {
    expect(familyMembersSchema.safeParse([anna, { ...jan, tag: 'ANNA' }]).success).toBe(false)
  })
})
