import { describe, expect, it } from 'vitest'
import type { Recurrence } from '../calendar/types'
import { isRuleLine, parseRuleLines, toRuleLine } from './recurrenceRule'

const rule = (patch: Partial<Recurrence> = {}): Recurrence => ({ frequency: 'weekly', weekdays: [], until: null, ...patch })

describe('toRuleLine', () => {
  it('writes the four kinds', () => {
    expect(toRuleLine(rule(), false)).toBe('RRULE:FREQ=WEEKLY')
    expect(toRuleLine(rule({ weekdays: [1, 3, 0] }), false)).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,SU')
    expect(toRuleLine(rule({ frequency: 'monthly' }), false)).toBe('RRULE:FREQ=MONTHLY')
    expect(toRuleLine(rule({ frequency: 'yearly' }), false)).toBe('RRULE:FREQ=YEARLY')
  })

  it('ignores weekdays for kinds other than weekly', () => {
    expect(toRuleLine(rule({ frequency: 'monthly', weekdays: [1] }), false)).toBe('RRULE:FREQ=MONTHLY')
  })

  it('ends an all-day series with a date', () => {
    expect(toRuleLine(rule({ until: '2026-12-31' }), true)).toBe('RRULE:FREQ=WEEKLY;UNTIL=20261231')
  })

  it('ends a timed series at the end of that day, as a UTC time', () => {
    const end = new Date(2026, 11, 31, 23, 59, 59).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    expect(toRuleLine(rule({ until: '2026-12-31' }), false)).toBe(`RRULE:FREQ=WEEKLY;UNTIL=${end}`)
    expect(end).toMatch(/^\d{8}T\d{6}Z$/)
  })
})

describe('parseRuleLines', () => {
  it('reads what the app writes', () => {
    expect(parseRuleLines(['RRULE:FREQ=WEEKLY'])).toEqual(rule())
    expect(parseRuleLines(['RRULE:FREQ=WEEKLY;BYDAY=MO,WE,SU'])).toEqual(rule({ weekdays: [1, 3, 0] }))
    expect(parseRuleLines(['RRULE:FREQ=MONTHLY'])).toEqual(rule({ frequency: 'monthly' }))
    expect(parseRuleLines(['RRULE:FREQ=YEARLY;UNTIL=20301231'])).toEqual(rule({ frequency: 'yearly', until: '2030-12-31' }))
  })

  it('reads a UTC end time as the local day it falls on', () => {
    const line = toRuleLine(rule({ until: '2026-12-31' }), false)
    expect(parseRuleLines([line])).toEqual(rule({ until: '2026-12-31' }))
  })

  it('does not mind lines such as EXDATE next to the rule', () => {
    expect(parseRuleLines(['EXDATE;TZID=Europe/Warsaw:20261020T090000', 'RRULE:FREQ=MONTHLY'])).toEqual(rule({ frequency: 'monthly' }))
  })

  it.each([
    ['no rule at all', []],
    ['only an EXDATE', ['EXDATE:20261020T090000Z']],
    ['two rules', ['RRULE:FREQ=WEEKLY', 'RRULE:FREQ=MONTHLY']],
    ['an interval', ['RRULE:FREQ=WEEKLY;INTERVAL=2']],
    ['a count', ['RRULE:FREQ=WEEKLY;COUNT=5']],
    ['a daily rule', ['RRULE:FREQ=DAILY']],
    ['no frequency', ['RRULE:BYDAY=MO']],
    ['BYDAY on a monthly rule', ['RRULE:FREQ=MONTHLY;BYDAY=MO']],
    ['an unknown weekday', ['RRULE:FREQ=WEEKLY;BYDAY=XX']],
    ['an unreadable end', ['RRULE:FREQ=WEEKLY;UNTIL=soon']],
    ['a part without a value', ['RRULE:FREQ=WEEKLY;BYDAY']],
    ['a repeated part', ['RRULE:FREQ=WEEKLY;FREQ=MONTHLY']],
  ])('calls %s a custom rule', (_name, lines) => {
    expect(parseRuleLines(lines)).toBe('custom')
  })
})

describe('isRuleLine', () => {
  it('tells RRULE lines from the others', () => {
    expect(isRuleLine('RRULE:FREQ=WEEKLY')).toBe(true)
    expect(isRuleLine('EXDATE:20261020T090000Z')).toBe(false)
  })
})
