import { describe, expect, it } from 'vitest'
import type { CalendarEventInput } from '../calendar/types'
import { applyEventInput, googleEventSchema, joinId, splitId, toCalendarEvent, type GoogleEvent } from './eventMapping'

const raw = (overrides: Record<string, unknown> = {}): GoogleEvent =>
  googleEventSchema.parse({ id: 'e1', summary: 'Dentysta', start: { dateTime: '2026-10-20T09:00:00+02:00' }, end: { dateTime: '2026-10-20T10:00:00+02:00' }, ...overrides })

describe('ids', () => {
  it('joins and splits a calendar id and an event id, also for ids with dots, hashes and at signs', () => {
    const id = joinId('en.polish#holiday@group.v.calendar.google.com', 'abc_20261020T090000Z')
    expect(id).toBe('en.polish#holiday@group.v.calendar.google.com|abc_20261020T090000Z')
    expect(splitId(id)).toEqual({ calendarId: 'en.polish#holiday@group.v.calendar.google.com', eventId: 'abc_20261020T090000Z' })
  })
})

describe('toCalendarEvent', () => {
  it('maps a timed event', () => {
    expect(toCalendarEvent('cal@x', raw())).toEqual({
      id: 'cal@x|e1',
      title: 'Dentysta',
      allDay: false,
      start: new Date('2026-10-20T09:00:00+02:00'),
      end: new Date('2026-10-20T10:00:00+02:00'),
    })
  })

  it('maps an all-day event to local midnights with an exclusive end', () => {
    const event = toCalendarEvent('cal@x', raw({ start: { date: '2026-10-20' }, end: { date: '2026-10-23' } }))!
    expect(event.allDay).toBe(true)
    expect(event.start).toEqual(new Date(2026, 9, 20))
    expect(event.end).toEqual(new Date(2026, 9, 23))
  })

  it('carries description, hidden properties and the series it belongs to', () => {
    const event = toCalendarEvent(
      'cal@x',
      raw({ description: 'Gabinet 3', recurringEventId: 'series1', extendedProperties: { private: { fhcTags: 'anna' } } }),
    )!
    expect(event.description).toBe('Gabinet 3')
    expect(event.recurringEventId).toBe('cal@x|series1')
    expect(event.extendedProperties).toEqual({ private: { fhcTags: 'anna' } })
  })

  it('uses an empty title when the event has none, and leaves out missing extras', () => {
    const event = toCalendarEvent('cal@x', raw({ summary: undefined }))!
    expect(event.title).toBe('')
    expect('description' in event).toBe(false)
    expect('recurringEventId' in event).toBe(false)
    expect('extendedProperties' in event).toBe(false)
  })

  it('ignores extended properties without private ones', () => {
    expect('extendedProperties' in toCalendarEvent('cal@x', raw({ extendedProperties: { shared: { a: 'b' } } }))!).toBe(false)
  })

  it('skips cancelled events and events without a start or an end', () => {
    expect(toCalendarEvent('cal@x', raw({ status: 'cancelled' }))).toBeNull()
    expect(toCalendarEvent('cal@x', raw({ start: {} }))).toBeNull()
    expect(toCalendarEvent('cal@x', raw({ end: {} }))).toBeNull()
    expect(toCalendarEvent('cal@x', raw({ start: { date: '2026-10-20' }, end: {} }))).toBeNull()
  })
})

describe('applyEventInput', () => {
  const timed: CalendarEventInput = { title: 'Nowe', allDay: false, start: new Date('2026-10-20T07:00:00Z'), end: new Date('2026-10-20T08:30:00Z') }

  it('builds a new timed event with an exact instant and the device time zone', () => {
    const body = applyEventInput(undefined, timed) as { summary: string; start: { dateTime: string; timeZone: string }; end: { dateTime: string } }
    expect(body.summary).toBe('Nowe')
    expect(body.start.dateTime).toBe('2026-10-20T07:00:00.000Z')
    expect(body.end.dateTime).toBe('2026-10-20T08:30:00.000Z')
    expect(body.start.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect('description' in body).toBe(false)
    expect('extendedProperties' in body).toBe(false)
  })

  it('builds an all-day event from local dates', () => {
    const body = applyEventInput(undefined, { title: 'Wyjazd', allDay: true, start: new Date(2026, 9, 20), end: new Date(2026, 9, 23) })
    expect(body.start).toEqual({ date: '2026-10-20' })
    expect(body.end).toEqual({ date: '2026-10-23' })
  })

  it('adds the description and the hidden properties', () => {
    const body = applyEventInput(undefined, { ...timed, description: 'Opis', extendedProperties: { private: { fhcTags: 'anna,jan' } } })
    expect(body.description).toBe('Opis')
    expect(body.extendedProperties).toEqual({ private: { fhcTags: 'anna,jan' } })
  })

  it('keeps everything it does not own when updating, and replaces the time of a timed event by a date', () => {
    const existing = raw({ attendees: [{ email: 'a@x' }], reminders: { useDefault: true }, description: 'Stary opis' })
    const body = applyEventInput(existing, { title: 'Zmienione', allDay: true, start: new Date(2026, 9, 21), end: new Date(2026, 9, 22) })
    expect(body.attendees).toEqual([{ email: 'a@x' }])
    expect(body.reminders).toEqual({ useDefault: true })
    expect(body.id).toBe('e1')
    expect(body.summary).toBe('Zmienione')
    expect(body.start).toEqual({ date: '2026-10-21' })
    expect('description' in body).toBe(false)
  })

  it('replaces the tags but keeps other private properties, and the shared ones', () => {
    const existing = raw({ extendedProperties: { private: { source: 'x', fhcTags: 'jan' }, shared: { s: '1' } } })
    const body = applyEventInput(existing, { ...timed, extendedProperties: { private: { source: 'x', fhcTags: 'anna' } } })
    expect(body.extendedProperties).toEqual({ private: { source: 'x', fhcTags: 'anna' }, shared: { s: '1' } })
  })

  it('removes the tags when nobody is selected anymore', () => {
    const existing = raw({ extendedProperties: { private: { source: 'x', fhcTags: 'jan' } } })
    expect(applyEventInput(existing, timed).extendedProperties).toEqual({ private: { source: 'x' } })
  })

  it('leaves an event that had extended properties but no more private ones with an empty private map', () => {
    const existing = raw({ extendedProperties: { private: { fhcTags: 'jan' } } })
    expect(applyEventInput(existing, timed).extendedProperties).toEqual({ private: {} })
  })
})
