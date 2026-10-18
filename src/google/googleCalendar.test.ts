import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '../calendar/types'
import { UserFacingError } from '../shared/userFacingError'
import { GoogleApiError, type GoogleApi } from './googleApi'
import { createGoogleCalendar } from './googleCalendar'

const range = { from: new Date('2026-10-01T00:00:00Z'), to: new Date('2026-11-01T00:00:00Z') }
const item = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  summary: id,
  start: { dateTime: '2026-10-20T09:00:00Z' },
  end: { dateTime: '2026-10-20T10:00:00Z' },
  ...extra,
})

function fakeApi(overrides: Partial<Record<keyof GoogleApi, unknown>> = {}) {
  const api = {
    getJson: vi.fn(),
    sendJson: vi.fn(),
    remove: vi.fn(async () => undefined),
    ...overrides,
  }
  return api as unknown as GoogleApi & { getJson: ReturnType<typeof vi.fn>; sendJson: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> }
}

const event = (id: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: 'Zmiana',
  allDay: false,
  start: new Date('2026-10-20T11:00:00Z'),
  end: new Date('2026-10-20T12:00:00Z'),
  ...extra,
})

describe('listEvents', () => {
  it('asks every chosen calendar for single events of the range and merges the results', async () => {
    const api = fakeApi()
    api.getJson.mockImplementation(async (path: string) => ({ items: [item(path.includes('a%40x') ? 'from-a' : 'from-b')] }))
    const calendar = createGoogleCalendar({ api, readIds: ['a@x', 'b@x'], writeId: null })
    const events = await calendar.listEvents(range)
    expect(events.map((e) => e.id)).toEqual(['a@x|from-a', 'b@x|from-b'])
    expect(api.getJson).toHaveBeenCalledTimes(2)
    const [path, , query] = api.getJson.mock.calls[0]
    expect(path).toBe('/calendars/a%40x/events')
    expect(query).toEqual({
      timeMin: '2026-10-01T00:00:00.000Z',
      timeMax: '2026-11-01T00:00:00.000Z',
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '2500',
    })
  })

  it('follows the pages of a long calendar', async () => {
    const api = fakeApi()
    api.getJson
      .mockResolvedValueOnce({ items: [item('one')], nextPageToken: 'next' })
      .mockResolvedValueOnce({ items: [item('two')] })
    const events = await createGoogleCalendar({ api, readIds: ['a@x'], writeId: null }).listEvents(range)
    expect(events.map((e) => e.id)).toEqual(['a@x|one', 'a@x|two'])
    expect(api.getJson.mock.calls[1][2]).toMatchObject({ pageToken: 'next' })
  })

  it('leaves out events the app cannot show', async () => {
    const api = fakeApi()
    api.getJson.mockResolvedValue({ items: [item('ok'), item('gone', { status: 'cancelled' })] })
    const events = await createGoogleCalendar({ api, readIds: ['a@x'], writeId: null }).listEvents(range)
    expect(events.map((e) => e.id)).toEqual(['a@x|ok'])
  })

  it('returns nothing when no calendar is chosen', async () => {
    const api = fakeApi()
    expect(await createGoogleCalendar({ api, readIds: [], writeId: null }).listEvents(range)).toEqual([])
    expect(api.getJson).not.toHaveBeenCalled()
  })
})

describe('createEvent', () => {
  it('posts to the write calendar and returns the created event with a calendar-qualified id', async () => {
    const api = fakeApi()
    api.sendJson.mockResolvedValue(item('created'))
    const created = await createGoogleCalendar({ api, readIds: [], writeId: 'w@x' }).createEvent({
      title: 'Nowe',
      allDay: false,
      start: new Date('2026-10-20T09:00:00Z'),
      end: new Date('2026-10-20T10:00:00Z'),
    })
    expect(created.id).toBe('w@x|created')
    const [method, path, body] = api.sendJson.mock.calls[0]
    expect([method, path]).toEqual(['POST', '/calendars/w%40x/events'])
    expect(body.summary).toBe('Nowe')
  })

  it('asks the user to choose a calendar when there is none to write to', async () => {
    const error = await createGoogleCalendar({ api: fakeApi(), readIds: [], writeId: null })
      .createEvent({ title: 'x', allDay: false, start: new Date(), end: new Date() })
      .catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as Error).message).toBe('Wybierz kalendarz do zapisu w ustawieniach.')
  })
})

describe('updateEvent', () => {
  it('reads the event, changes what the app owns and puts the whole event back', async () => {
    const api = fakeApi()
    api.getJson.mockResolvedValue(item('e1', { attendees: [{ email: 'a@x' }] }))
    api.sendJson.mockResolvedValue(item('e1'))
    await createGoogleCalendar({ api, readIds: [], writeId: null }).updateEvent(event('c@x|e1'))
    expect(api.getJson.mock.calls[0][0]).toBe('/calendars/c%40x/events/e1')
    const [method, path, body] = api.sendJson.mock.calls[0]
    expect([method, path]).toEqual(['PUT', '/calendars/c%40x/events/e1'])
    expect(body.summary).toBe('Zmiana')
    expect(body.attendees).toEqual([{ email: 'a@x' }])
    expect(body.start.dateTime).toBe('2026-10-20T11:00:00.000Z')
  })

  it('encodes ids of recurring occurrences', async () => {
    const api = fakeApi()
    api.getJson.mockResolvedValue(item('series_20261020T090000Z'))
    api.sendJson.mockResolvedValue(item('series_20261020T090000Z'))
    await createGoogleCalendar({ api, readIds: [], writeId: null }).updateEvent(event('c@x|series_20261020T090000Z'))
    expect(api.sendJson.mock.calls[0][1]).toBe('/calendars/c%40x/events/series_20261020T090000Z')
  })
})

describe('deleteEvent', () => {
  it('deletes the occurrence itself', async () => {
    const api = fakeApi()
    await createGoogleCalendar({ api, readIds: [], writeId: null }).deleteEvent(event('c@x|e1_20261020', { recurringEventId: 'c@x|e1' }), 'occurrence')
    expect(api.remove).toHaveBeenCalledWith('/calendars/c%40x/events/e1_20261020')
  })

  it('deletes the whole series through the series id', async () => {
    const api = fakeApi()
    await createGoogleCalendar({ api, readIds: [], writeId: null }).deleteEvent(event('c@x|e1_20261020', { recurringEventId: 'c@x|e1' }), 'series')
    expect(api.remove).toHaveBeenCalledWith('/calendars/c%40x/events/e1')
  })

  it('deletes a single event even when the series scope is asked for', async () => {
    const api = fakeApi()
    await createGoogleCalendar({ api, readIds: [], writeId: null }).deleteEvent(event('c@x|plain'), 'series')
    expect(api.remove).toHaveBeenCalledWith('/calendars/c%40x/events/plain')
  })

  it('counts an event that is already gone (410) as deleted', async () => {
    const api = fakeApi({ remove: vi.fn(async () => Promise.reject(new GoogleApiError(410, 'gone'))) })
    await expect(createGoogleCalendar({ api, readIds: [], writeId: null }).deleteEvent(event('c@x|e1'), 'occurrence')).resolves.toBeUndefined()
  })

  it('passes other failures on', async () => {
    const forbidden = fakeApi({ remove: vi.fn(async () => Promise.reject(new GoogleApiError(403, 'no'))) })
    await expect(createGoogleCalendar({ api: forbidden, readIds: [], writeId: null }).deleteEvent(event('c@x|e1'), 'occurrence')).rejects.toThrow('no')
    const offline = fakeApi({ remove: vi.fn(async () => Promise.reject(new UserFacingError('offline'))) })
    await expect(createGoogleCalendar({ api: offline, readIds: [], writeId: null }).deleteEvent(event('c@x|e1'), 'occurrence')).rejects.toThrow('offline')
  })
})
