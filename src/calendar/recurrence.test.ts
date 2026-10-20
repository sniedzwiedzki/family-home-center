import { describe, expect, it } from 'vitest'
import { fieldsFromRecurrence, NO_REPEAT, recurrenceFromFields, REPEAT_LABELS, WEEKDAYS } from './recurrence'

describe('recurrenceFromFields', () => {
  it('is nothing when the event does not repeat, whatever else is filled in', () => {
    expect(recurrenceFromFields(NO_REPEAT)).toBeNull()
    expect(recurrenceFromFields({ repeat: 'none', repeatDays: [1], repeatUntil: '2026-12-31' })).toBeNull()
  })

  it('maps every kind, with no weekdays outside "weekdays"', () => {
    expect(recurrenceFromFields({ repeat: 'weekly', repeatDays: [1, 3], repeatUntil: '' })).toEqual({ frequency: 'weekly', weekdays: [], until: null })
    expect(recurrenceFromFields({ repeat: 'monthly', repeatDays: [], repeatUntil: '' })).toEqual({ frequency: 'monthly', weekdays: [], until: null })
    expect(recurrenceFromFields({ repeat: 'yearly', repeatDays: [], repeatUntil: '2030-01-01' })).toEqual({ frequency: 'yearly', weekdays: [], until: '2030-01-01' })
  })

  it('keeps the chosen weekdays in order for "weekdays"', () => {
    expect(recurrenceFromFields({ repeat: 'weekdays', repeatDays: [5, 1, 0], repeatUntil: '' })).toEqual({ frequency: 'weekly', weekdays: [0, 1, 5], until: null })
  })
})

describe('fieldsFromRecurrence', () => {
  it('turns every recurrence back into form fields', () => {
    expect(fieldsFromRecurrence({ frequency: 'weekly', weekdays: [], until: null })).toEqual({ repeat: 'weekly', repeatDays: [], repeatUntil: '' })
    expect(fieldsFromRecurrence({ frequency: 'weekly', weekdays: [1, 4], until: '2026-12-31' })).toEqual({ repeat: 'weekdays', repeatDays: [1, 4], repeatUntil: '2026-12-31' })
    expect(fieldsFromRecurrence({ frequency: 'monthly', weekdays: [], until: null })).toEqual({ repeat: 'monthly', repeatDays: [], repeatUntil: '' })
    expect(fieldsFromRecurrence({ frequency: 'yearly', weekdays: [], until: '2030-01-01' })).toEqual({ repeat: 'yearly', repeatDays: [], repeatUntil: '2030-01-01' })
  })
})

describe('labels', () => {
  it('has a Polish label for every kind and the weekdays from Monday to Sunday', () => {
    expect(Object.values(REPEAT_LABELS)).toEqual(['Nie powtarzaj', 'Co tydzień', 'Co tydzień w wybrane dni', 'Co miesiąc tego dnia', 'Co rok tego dnia'])
    expect(WEEKDAYS.map(({ label }) => label)).toEqual(['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'])
    expect(WEEKDAYS.map(({ day }) => day)).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})
