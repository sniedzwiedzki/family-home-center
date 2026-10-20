import { describe, expect, it, vi } from 'vitest'
import { createLocalCalendar } from '../calendar/localCalendar'
import type { CalendarEvent, CalendarPort, SeriesPort } from '../calendar/types'
import type { FamilyMember } from '../family/familyMember'
import { createToolExecutor } from './toolExecutor'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#0000ff' },
]

function setup() {
  const store = new Map<string, string>()
  const port = createLocalCalendar({ getItem: (key) => store.get(key) ?? null, setItem: (key, value) => void store.set(key, value) })
  return { port, executor: createToolExecutor({ port, members }) }
}

const call = (name: string, args: unknown) => ({ id: 'c1', name, args })
const output = (outcome: { output: unknown }) => outcome.output as Record<string, unknown>

async function seed(port: CalendarPort, input: Partial<CalendarEvent> = {}) {
  return port.createEvent({
    title: 'Dentysta',
    allDay: false,
    start: new Date(2026, 9, 21, 15, 0),
    end: new Date(2026, 9, 21, 16, 0),
    extendedProperties: { private: { fhcTags: 'anna' } },
    ...input,
  })
}

describe('list_events', () => {
  it('returns the events of the days (inclusive) in start order and remembers them', async () => {
    const { port, executor } = setup()
    await seed(port, { title: 'Później', start: new Date(2026, 9, 22, 9), end: new Date(2026, 9, 22, 10) })
    const first = await seed(port)
    const outcome = await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-22' }))
    expect(outcome.kind).toBe('done')
    const events = output(outcome).events as { id: string; title: string; tags: string[]; startTime: string; date: string }[]
    expect(events.map((event) => event.title)).toEqual(['Dentysta', 'Później'])
    expect(events[0]).toMatchObject({ id: first.id, tags: ['anna'], date: '2026-10-21', startTime: '15:00' })
    expect(output(outcome).truncated).toBe(false)
  })

  it('describes an all-day event without times', async () => {
    const { port, executor } = setup()
    await seed(port, { title: 'Wakacje', allDay: true, start: new Date(2026, 9, 21), end: new Date(2026, 9, 23), extendedProperties: undefined })
    const outcome = await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    const [event] = output(outcome).events as Record<string, unknown>[]
    expect(event).toMatchObject({ allDay: true, date: '2026-10-21', endDate: '2026-10-22', tags: [] })
    expect(event).not.toHaveProperty('startTime')
  })

  it('cuts a long list and says so', async () => {
    const { port, executor } = setup()
    for (let index = 0; index < 101; index++) await seed(port, { title: `E${index}` })
    const outcome = await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    expect((output(outcome).events as unknown[]).length).toBe(100)
    expect(output(outcome).truncated).toBe(true)
  })

  it('rejects a backwards or impossible range and malformed arguments', async () => {
    const { executor } = setup()
    expect(output(await executor.execute(call('list_events', { from: '2026-10-22', to: '2026-10-21' })))).toEqual({ error: 'Invalid date range.' })
    expect(output(await executor.execute(call('list_events', { from: '2026-02-31', to: '2026-03-01' })))).toEqual({ error: 'Invalid date range.' })
    expect(String(output(await executor.execute(call('list_events', { from: 'jutro' }))).error)).toContain('Invalid arguments')
  })
})

describe('create_event', () => {
  it('creates a timed event for the tagged people, one hour long by default', async () => {
    const { port, executor } = setup()
    const outcome = await executor.execute(call('create_event', { title: 'Basen', date: '2026-10-23', startTime: '17:00', tags: ['Jan', 'anna'] }))
    expect(outcome).toMatchObject({ kind: 'done', summary: 'Dodano wydarzenie „Basen” (2026-10-23).' })
    const [event] = await port.listEvents({ from: new Date(2026, 9, 23), to: new Date(2026, 9, 24) })
    expect(event).toMatchObject({ title: 'Basen', allDay: false, start: new Date(2026, 9, 23, 17), end: new Date(2026, 9, 23, 18) })
    expect(event.extendedProperties?.private?.fhcTags).toBe('anna,jan')
  })

  it('ends an event that starts in the last hour of the day at 23:59', async () => {
    const { port, executor } = setup()
    await executor.execute(call('create_event', { title: 'Nocny film', date: '2026-10-23', startTime: '23:30' }))
    const [event] = await port.listEvents({ from: new Date(2026, 9, 23), to: new Date(2026, 9, 24) })
    expect(event.end).toEqual(new Date(2026, 9, 23, 23, 59))
  })

  it('takes an explicit end time and end date', async () => {
    const { port, executor } = setup()
    await executor.execute(call('create_event', { title: 'Obóz', date: '2026-10-23', endDate: '2026-10-24', startTime: '08:00', endTime: '12:00' }))
    const [event] = await port.listEvents({ from: new Date(2026, 9, 23), to: new Date(2026, 9, 25) })
    expect(event).toMatchObject({ start: new Date(2026, 9, 23, 8), end: new Date(2026, 9, 24, 12) })
  })

  it('makes an event without a start time an all-day event, with a description', async () => {
    const { port, executor } = setup()
    await executor.execute(call('create_event', { title: 'Urodziny', date: '2026-10-25', description: 'Tort' }))
    const [event] = await port.listEvents({ from: new Date(2026, 9, 25), to: new Date(2026, 9, 26) })
    expect(event).toMatchObject({ allDay: true, description: 'Tort', start: new Date(2026, 9, 25), end: new Date(2026, 9, 26) })
  })

  it('honours an explicit all-day flag', async () => {
    const { port, executor } = setup()
    await executor.execute(call('create_event', { title: 'Wolne', date: '2026-10-25', allDay: true, startTime: '10:00' }))
    const [event] = await port.listEvents({ from: new Date(2026, 9, 25), to: new Date(2026, 9, 26) })
    expect(event.allDay).toBe(true)
  })

  it('refuses to create the same event twice in one command, timed or all-day, and offers update_event', async () => {
    const { port, executor } = setup()
    const first = await executor.execute(call('create_event', { title: 'Basen', date: '2026-10-23', startTime: '17:00' }))
    const id = ((output(first).created as { id: string }).id)
    const again = await executor.execute(call('create_event', { title: 'basen', date: '2026-10-23' }))
    expect(String(output(again).error)).toContain(`already created in this command (id ${id})`)
    expect(await port.listEvents({ from: new Date(2026, 9, 23), to: new Date(2026, 9, 24) })).toHaveLength(1)
    const other = await executor.execute(call('create_event', { title: 'Basen', date: '2026-10-24' }))
    expect(other).toMatchObject({ kind: 'done', summary: expect.stringContaining('Dodano') })
  })

  it('refuses unknown tags and says which ones are known', async () => {
    const { port, executor } = setup()
    const outcome = await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', tags: ['babcia'] }))
    expect(output(outcome)).toEqual({ error: 'Unknown tags: babcia. Known tags: anna, jan.' })
    expect(await port.listEvents({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })).toEqual([])
  })

  it('says so when no family member is configured', async () => {
    const port = createLocalCalendar({ getItem: () => null, setItem: () => undefined })
    const outcome = await createToolExecutor({ port, members: [] }).execute(call('create_event', { title: 'X', date: '2026-10-23', tags: ['anna'] }))
    expect(output(outcome)).toEqual({ error: 'Unknown tags: anna. Known tags: none.' })
  })

  it('reports validation problems back to the model instead of saving', async () => {
    const { executor } = setup()
    expect(output(await executor.execute(call('create_event', { title: '  ', date: '2026-10-23' })))).toEqual({ error: 'Podaj tytuł' })
    expect(output(await executor.execute(call('create_event', { title: 'X', date: '2026-02-31' })))).toEqual({ error: 'Podaj datę' })
    expect(output(await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', startTime: '25:00' })))).toEqual({ error: 'Podaj godziny' })
    expect(output(await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', startTime: '10:00', endTime: '09:00' })))).toEqual({
      error: 'Koniec musi być po początku',
    })
    expect(String(output(await executor.execute(call('create_event', { date: '2026-10-23' }))).error)).toContain('Invalid arguments')
  })
})

describe('repeating events', () => {
  const googleLike = () => {
    const createEvent = vi.fn(async (input) => ({ ...input, id: 'new' }))
    const port: CalendarPort = {
      listEvents: vi.fn(async () => []),
      createEvent,
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
      series: { loadRule: vi.fn(), update: vi.fn() } as SeriesPort,
    }
    return { createEvent, executor: createToolExecutor({ port, members }) }
  }

  it('creates an event that repeats every week, and says so', async () => {
    const { createEvent, executor } = googleLike()
    const outcome = await executor.execute(call('create_event', { title: 'Basen', date: '2026-10-23', startTime: '17:00', repeat: 'weekly' }))
    expect(createEvent.mock.calls[0][0].recurrence).toEqual({ frequency: 'weekly', weekdays: [], until: null })
    expect(outcome).toMatchObject({ summary: 'Dodano wydarzenie „Basen” (2026-10-23, co tydzień).' })
  })

  it('maps weekday names (Monday first) to the numbers the calendar uses, and takes an end date', async () => {
    const { createEvent, executor } = googleLike()
    await executor.execute(
      call('create_event', { title: 'Szkoła', date: '2026-10-23', startTime: '08:00', repeat: 'weekdays', repeatDays: ['mon', 'sat', 'sun'], repeatUntil: '2027-06-25' }),
    )
    expect(createEvent.mock.calls[0][0].recurrence).toEqual({ frequency: 'weekly', weekdays: [0, 1, 6], until: '2027-06-25' })
  })

  it('creates monthly and yearly events', async () => {
    const { createEvent, executor } = googleLike()
    await executor.execute(call('create_event', { title: 'Czynsz', date: '2026-10-05', repeat: 'monthly' }))
    await executor.execute(call('create_event', { title: 'Urodziny', date: '2026-10-06', repeat: 'yearly' }))
    expect(createEvent.mock.calls.map(([input]) => input.recurrence.frequency)).toEqual(['monthly', 'yearly'])
  })

  it('refuses to repeat without Google Calendar and creates nothing', async () => {
    const { port, executor } = setup()
    const outcome = await executor.execute(call('create_event', { title: 'Basen', date: '2026-10-23', repeat: 'weekly' }))
    expect(String(output(outcome).error)).toContain('need Google Calendar')
    expect(await port.listEvents({ from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) })).toEqual([])
  })

  it('reports an invalid repeat back to the model', async () => {
    const { executor } = googleLike()
    expect(output(await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', repeat: 'weekdays' })))).toEqual({ error: 'Wybierz dni tygodnia' })
    expect(String(output(await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', repeat: 'daily' }))).error)).toContain('Invalid arguments')
    expect(String(output(await executor.execute(call('create_event', { title: 'X', date: '2026-10-23', repeat: 'weekdays', repeatDays: ['funday'] }))).error)).toContain('Invalid arguments')
  })

  it('tells the model which listed events belong to a series', async () => {
    const port: CalendarPort = {
      listEvents: vi.fn(async () => [
        { id: 'a|s_1', recurringEventId: 'a|s', title: 'Basen', allDay: false, start: new Date(2026, 9, 21, 17), end: new Date(2026, 9, 21, 18) },
        { id: 'a|one', title: 'Jednorazowe', allDay: false, start: new Date(2026, 9, 22, 17), end: new Date(2026, 9, 22, 18) },
      ]),
      createEvent: vi.fn(),
      updateEvent: vi.fn(),
      deleteEvent: vi.fn(),
    }
    const outcome = await createToolExecutor({ port, members }).execute(call('list_events', { from: '2026-10-21', to: '2026-10-22' }))
    expect((output(outcome).events as { recurring: boolean }[]).map((event) => event.recurring)).toEqual([true, false])
  })
})

describe('update_event', () => {
  it('changes only the given fields of an event it has listed', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    const outcome = await executor.execute(call('update_event', { eventId: event.id, title: 'Ortodonta', startTime: '16:30', tags: ['jan'] }))
    expect(outcome).toMatchObject({ kind: 'done', summary: 'Zmieniono wydarzenie „Ortodonta”.' })
    const [stored] = await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })
    expect(stored).toMatchObject({ id: event.id, title: 'Ortodonta', start: new Date(2026, 9, 21, 16, 30), end: new Date(2026, 9, 21, 17, 30) })
    expect(stored.extendedProperties?.private?.fhcTags).toBe('jan')
  })

  it('keeps everything else when only the description changes', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    await executor.execute(call('update_event', { eventId: event.id, description: 'Weź kartę' }))
    const [stored] = await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })
    expect(stored).toMatchObject({ title: 'Dentysta', description: 'Weź kartę', start: event.start, end: event.end })
    expect(stored.extendedProperties?.private?.fhcTags).toBe('anna')
  })

  it('moves a one-day event to another day', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    await executor.execute(call('update_event', { eventId: event.id, date: '2026-10-24' }))
    const [stored] = await port.listEvents({ from: new Date(2026, 9, 24), to: new Date(2026, 9, 25) })
    expect(stored).toMatchObject({ start: new Date(2026, 9, 24, 15), end: new Date(2026, 9, 24, 16) })
  })

  it('needs an explicit end date to move a multi-day event, otherwise reports the problem', async () => {
    const { port, executor } = setup()
    const event = await seed(port, { allDay: true, start: new Date(2026, 9, 21), end: new Date(2026, 9, 23) })
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    expect(output(await executor.execute(call('update_event', { eventId: event.id, date: '2026-10-25' })))).toEqual({
      error: 'Data końca nie może być przed początkiem',
    })
    await executor.execute(call('update_event', { eventId: event.id, date: '2026-10-25', endDate: '2026-10-26' }))
    const [stored] = await port.listEvents({ from: new Date(2026, 9, 25), to: new Date(2026, 9, 27) })
    expect(stored).toMatchObject({ allDay: true, start: new Date(2026, 9, 25), end: new Date(2026, 9, 27) })
  })

  it('turns an all-day event into a timed one when a start time is given, and back with allDay', async () => {
    const { port, executor } = setup()
    const event = await seed(port, { allDay: true, start: new Date(2026, 9, 21), end: new Date(2026, 9, 22) })
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    await executor.execute(call('update_event', { eventId: event.id, startTime: '10:00', endTime: '11:30' }))
    let [stored] = await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })
    expect(stored).toMatchObject({ allDay: false, start: new Date(2026, 9, 21, 10), end: new Date(2026, 9, 21, 11, 30) })
    await executor.execute(call('update_event', { eventId: event.id, allDay: true }))
    ;[stored] = await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })
    expect(stored.allDay).toBe(true)
  })

  it('refuses ids it has not listed, unknown tags and invalid results', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    expect(String(output(await executor.execute(call('update_event', { eventId: event.id, title: 'X' }))).error)).toContain('call list_events first')
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    expect(String(output(await executor.execute(call('update_event', { eventId: event.id, tags: ['babcia'] }))).error)).toContain('Unknown tags: babcia')
    expect(output(await executor.execute(call('update_event', { eventId: event.id, title: '' })))).toEqual({ error: 'Podaj tytuł' })
    expect(String(output(await executor.execute(call('update_event', { title: 'X' }))).error)).toContain('Invalid arguments')
  })
})

describe('delete_event', () => {
  it('asks for confirmation instead of deleting', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    const outcome = await executor.execute(call('delete_event', { eventId: event.id }))
    expect(outcome).toMatchObject({ kind: 'confirm', event: { id: event.id } })
    expect(await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })).toHaveLength(1)
  })

  it('deletes after the user confirmed, and forgets the event', async () => {
    const { port, executor } = setup()
    const event = await seed(port)
    await executor.execute(call('list_events', { from: '2026-10-21', to: '2026-10-21' }))
    await executor.deleteConfirmed(event)
    expect(await port.listEvents({ from: new Date(2026, 9, 21), to: new Date(2026, 9, 22) })).toEqual([])
    expect(String(output(await executor.execute(call('delete_event', { eventId: event.id }))).error)).toContain('call list_events first')
  })

  it('deletes only this occurrence of a recurring event', async () => {
    const deleteEvent = vi.fn(async () => undefined)
    const port: CalendarPort = { listEvents: async () => [], createEvent: vi.fn(), updateEvent: vi.fn(), deleteEvent }
    const event: CalendarEvent = { id: 'g|1_20261021', recurringEventId: 'g|1', title: 'Lekcja', allDay: false, start: new Date(2026, 9, 21, 9), end: new Date(2026, 9, 21, 10) }
    await createToolExecutor({ port, members }).deleteConfirmed(event)
    expect(deleteEvent).toHaveBeenCalledWith(event, 'occurrence')
  })

  it('refuses malformed arguments', async () => {
    const { executor } = setup()
    expect(String(output(await executor.execute(call('delete_event', {}))).error)).toContain('Invalid arguments')
  })
})

describe('unknown tools', () => {
  it('are reported back to the model', async () => {
    const { executor } = setup()
    expect(output(await executor.execute(call('rm_rf', {})))).toEqual({ error: 'Unknown tool: rm_rf.' })
  })
})
