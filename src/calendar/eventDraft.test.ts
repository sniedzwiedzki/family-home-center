import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { draftFromEvent, draftToInput, newDraft, type EventDraft } from './eventDraft'
import type { CalendarEvent } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#f4a3a8' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#9ec5f0' },
]
const draft = (overrides: Partial<EventDraft> = {}): EventDraft => ({
  title: 'Dentysta',
  description: '',
  memberIds: [],
  allDay: false,
  startDate: '2026-10-20',
  endDate: '2026-10-20',
  startTime: '09:00',
  endTime: '10:30',
  ...overrides,
})
const failure = (result: ReturnType<typeof draftToInput>) => {
  if (result.ok) throw new Error('expected a validation failure')
  return result.errors
}
const success = (result: ReturnType<typeof draftToInput>) => {
  if (!result.ok) throw new Error(`expected success, got ${JSON.stringify(result.errors)}`)
  return result.input
}

describe('newDraft', () => {
  it('starts on the given day with 09:00-10:00 and the given people', () => {
    expect(newDraft(new Date(2026, 9, 5), ['a'])).toEqual({
      title: '',
      description: '',
      memberIds: ['a'],
      allDay: false,
      startDate: '2026-10-05',
      endDate: '2026-10-05',
      startTime: '09:00',
      endTime: '10:00',
    })
  })
})

describe('newDraft from a clicked hour', () => {
  it('lasts one hour from the clicked hour', () => {
    expect(newDraft(new Date(2026, 9, 5), [], 14)).toMatchObject({ startTime: '14:00', endTime: '15:00' })
    expect(newDraft(new Date(2026, 9, 5), [], 7)).toMatchObject({ startTime: '07:00', endTime: '08:00' })
  })

  it('ends at 23:59 when the clicked hour is the last of the day', () => {
    expect(newDraft(new Date(2026, 9, 5), [], 23)).toMatchObject({ startTime: '23:00', endTime: '23:59' })
  })
})

describe('draftFromEvent', () => {
  const timed: CalendarEvent = {
    id: 'e',
    title: 'Trening #anna',
    description: 'Hala',
    allDay: false,
    start: new Date(2026, 9, 20, 7, 5),
    end: new Date(2026, 9, 20, 18, 0),
    extendedProperties: { private: { fhcTags: 'jan' } },
  }

  it('turns a timed event into form values, with people from tags and a title without #tags', () => {
    expect(draftFromEvent(timed, members)).toEqual({
      title: 'Trening',
      description: 'Hala',
      memberIds: ['a', 'j'],
      allDay: false,
      startDate: '2026-10-20',
      endDate: '2026-10-20',
      startTime: '07:05',
      endTime: '18:00',
    })
  })

  it('shows the last covered day of an all-day event, with default times', () => {
    const allDay: CalendarEvent = { id: 'e', title: 'Wyjazd', allDay: true, start: new Date(2026, 9, 20), end: new Date(2026, 9, 23) }
    expect(draftFromEvent(allDay, members)).toMatchObject({
      allDay: true,
      description: '',
      memberIds: [],
      startDate: '2026-10-20',
      endDate: '2026-10-22',
      startTime: '09:00',
      endTime: '10:00',
    })
  })
})

describe('draftToInput', () => {
  it('builds a timed event', () => {
    expect(success(draftToInput(draft({ description: '  Gabinet 3  ' }), members))).toEqual({
      title: 'Dentysta',
      description: 'Gabinet 3',
      allDay: false,
      start: new Date(2026, 9, 20, 9, 0),
      end: new Date(2026, 9, 20, 10, 30),
    })
  })

  it('lets a timed event cross midnight', () => {
    const input = success(draftToInput(draft({ endDate: '2026-10-21', endTime: '02:00', startTime: '22:00' }), members))
    expect(input.end).toEqual(new Date(2026, 9, 21, 2, 0))
  })

  it('builds an all-day event whose end is exclusive', () => {
    const input = success(draftToInput(draft({ allDay: true, endDate: '2026-10-22', startTime: '', endTime: '' }), members))
    expect(input.allDay).toBe(true)
    expect(input.start).toEqual(new Date(2026, 9, 20))
    expect(input.end).toEqual(new Date(2026, 9, 23))
  })

  it('stores the selected people as tags and merges #tags typed in the title without duplicates', () => {
    const input = success(draftToInput(draft({ title: 'Kino #jan #anna #goście', memberIds: ['a'] }), members))
    expect(input.title).toBe('Kino')
    expect(input.extendedProperties).toEqual({ private: { fhcTags: 'anna,jan,goście' } })
  })

  it('keeps other hidden properties of an existing event and replaces its tags', () => {
    const existing: CalendarEvent = {
      id: 'e',
      title: 'x',
      allDay: false,
      start: new Date(),
      end: new Date(),
      extendedProperties: { private: { source: 'google', fhcTags: 'jan' } },
    }
    const input = success(draftToInput(draft({ memberIds: ['a'] }), members, existing))
    expect(input.extendedProperties).toEqual({ private: { source: 'google', fhcTags: 'anna' } })
  })

  it('drops the tags property when nobody is selected but keeps other properties', () => {
    const existing: CalendarEvent = {
      id: 'e',
      title: 'x',
      allDay: false,
      start: new Date(),
      end: new Date(),
      extendedProperties: { private: { source: 'google', fhcTags: 'jan' } },
    }
    expect(success(draftToInput(draft(), members, existing)).extendedProperties).toEqual({ private: { source: 'google' } })
  })

  it('leaves out empty description and extended properties', () => {
    const input = success(draftToInput(draft(), members))
    expect('description' in input).toBe(false)
    expect('extendedProperties' in input).toBe(false)
  })

  it('requires a title, also when only #tags were typed', () => {
    expect(failure(draftToInput(draft({ title: '   ' }), members)).title).toBe('Podaj tytuł')
    expect(failure(draftToInput(draft({ title: '#anna' }), members)).title).toBe('Podaj tytuł')
  })

  it.each([
    ['empty', ''],
    ['malformed', '20-10-2026'],
    ['not a real day', '2026-02-30'],
  ])('rejects a %s start date', (_label, startDate) => {
    expect(failure(draftToInput(draft({ startDate }), members)).date).toBe('Podaj datę')
  })

  it('rejects an invalid end date', () => {
    expect(failure(draftToInput(draft({ endDate: '' }), members)).date).toBe('Podaj datę')
  })

  it('rejects an all-day event that ends before it starts', () => {
    expect(failure(draftToInput(draft({ allDay: true, endDate: '2026-10-19' }), members)).date).toBe(
      'Data końca nie może być przed początkiem',
    )
  })

  it.each([
    ['missing start time', { startTime: '' }],
    ['missing end time', { endTime: '' }],
    ['hour out of range', { startTime: '24:00' }],
    ['minutes out of range', { endTime: '10:75' }],
  ])('rejects %s', (_label, overrides) => {
    expect(failure(draftToInput(draft(overrides), members)).time).toBe('Podaj godziny')
  })

  it('rejects an end that is not after the start', () => {
    expect(failure(draftToInput(draft({ endTime: '09:00' }), members)).time).toBe('Koniec musi być po początku')
    expect(failure(draftToInput(draft({ endTime: '08:00' }), members)).time).toBe('Koniec musi być po początku')
  })

  it('reports several problems at once', () => {
    const errors = failure(draftToInput(draft({ title: '', endTime: '08:00' }), members))
    expect(Object.keys(errors).sort()).toEqual(['time', 'title'])
  })

  it('does not check times for an all-day event', () => {
    expect(draftToInput(draft({ allDay: true, startTime: 'zzz', endTime: '' }), members).ok).toBe(true)
  })
})
