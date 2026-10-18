import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLocalCalendar, EVENTS_STORAGE_KEY } from './localCalendar'
import type { CalendarEventInput } from './types'

const input = (title: string, startDay: number, endDay = startDay + 1): CalendarEventInput => ({
  title,
  allDay: true,
  start: new Date(2026, 9, startDay),
  end: new Date(2026, 9, endDay),
})
const range = (fromDay: number, toDay: number) => ({ from: new Date(2026, 9, fromDay), to: new Date(2026, 9, toDay) })

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('createLocalCalendar', () => {
  it('starts empty', async () => {
    expect(await createLocalCalendar(window.localStorage).listEvents(range(1, 31))).toEqual([])
  })

  it('creates events with fresh ids and lists the ones overlapping the range', async () => {
    const calendar = createLocalCalendar(window.localStorage)
    const first = await calendar.createEvent(input('Pierwsze', 10))
    const second = await calendar.createEvent(input('Drugie', 20, 23))
    await calendar.createEvent(input('Poza zakresem', 28))
    expect(first.id).not.toBe(second.id)
    const listed = await calendar.listEvents(range(9, 22))
    expect(listed.map((event) => event.title)).toEqual(['Pierwsze', 'Drugie'])
  })

  it('keeps events across instances, restoring dates and extra properties', async () => {
    const event = await createLocalCalendar(window.localStorage).createEvent({
      ...input('Z tagiem', 10),
      description: 'Opis',
      extendedProperties: { private: { fhcTags: 'anna' } },
    })
    const [restored] = await createLocalCalendar(window.localStorage).listEvents(range(1, 31))
    expect(restored).toEqual(event)
    expect(restored.start).toBeInstanceOf(Date)
  })

  it('updates an event in place', async () => {
    const calendar = createLocalCalendar(window.localStorage)
    const event = await calendar.createEvent(input('Stare', 10))
    await calendar.createEvent(input('Inne', 11))
    await calendar.updateEvent({ ...event, title: 'Nowe' })
    const titles = (await calendar.listEvents(range(1, 31))).map((e) => e.title)
    expect(titles).toEqual(['Nowe', 'Inne'])
  })

  it('refuses to update an event that does not exist', async () => {
    const calendar = createLocalCalendar(window.localStorage)
    await expect(calendar.updateEvent({ ...input('X', 10), id: 'missing' })).rejects.toThrow('missing')
  })

  it('deletes an event', async () => {
    const calendar = createLocalCalendar(window.localStorage)
    const event = await calendar.createEvent(input('Do usunięcia', 10))
    await calendar.createEvent(input('Zostaje', 11))
    await calendar.deleteEvent(event, 'occurrence')
    expect((await calendar.listEvents(range(1, 31))).map((e) => e.title)).toEqual(['Zostaje'])
  })

  it('starts empty when the stored shape is wrong', async () => {
    window.localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify([{ id: 1 }]))
    expect(await createLocalCalendar(window.localStorage).listEvents(range(1, 31))).toEqual([])
  })

  it('starts empty and logs when the stored JSON is broken', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    window.localStorage.setItem(EVENTS_STORAGE_KEY, '{nope')
    expect(await createLocalCalendar(window.localStorage).listEvents(range(1, 31))).toEqual([])
    expect(log).toHaveBeenCalledTimes(1)
  })
})
