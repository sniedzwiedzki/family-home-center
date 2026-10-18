import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { CalendarView } from './CalendarView'
import { formatMonthLabel } from '../shared/format'
import { addDays, dayKey } from './days'
import type { DayForecast, HourForecast } from '../weather/types'
import type { CalendarEvent, CalendarPort } from './types'

const members: FamilyMember[] = [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }]

interface FakeObserver {
  callback: IntersectionObserverCallback
  targets: Element[]
  disconnect: ReturnType<typeof vi.fn>
}
let observers: FakeObserver[]
let scrollIntoView: ReturnType<typeof vi.fn>
let rowTops: number[]
let todayRect: DOMRect

const today = new Date()
const todayEvent: CalendarEvent = {
  id: 'today',
  title: 'Dzisiejsze #anna',
  allDay: false,
  start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9),
  end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10),
}
const noForecasts = new Map<string, DayForecast>()
const noHours = new Map<number, HourForecast>()
const portOf = (listEvents: CalendarPort['listEvents']): CalendarPort => ({
  listEvents,
  createEvent: vi.fn(async (input) => ({ ...input, id: 'created' })),
  updateEvent: vi.fn(async () => undefined),
  deleteEvent: vi.fn(async () => undefined),
})
const port = (): CalendarPort => portOf(vi.fn(async () => [todayEvent]))

const rows = (container: HTMLElement) => container.querySelectorAll('.day-row')

const rect = (top: number, bottom: number) =>
  ({ top, bottom, height: bottom - top, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect

function intersect(target: Element | undefined, isIntersecting = true) {
  const observer = observers[0]
  act(() => observer.callback([{ target, isIntersecting } as IntersectionObserverEntry], observer as unknown as IntersectionObserver))
}

const atTime = (hour: number, minute = 0) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute)

beforeEach(() => {
  // Only Date is faked, so the events load as usual; the hour view depends on the time of day.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(atTime(12))
  observers = []
  rowTops = []
  scrollIntoView = vi.fn()
  Element.prototype.scrollIntoView = scrollIntoView as unknown as typeof Element.prototype.scrollIntoView
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      targets: Element[] = []
      disconnect = vi.fn()
      callback: IntersectionObserverCallback
      constructor(callback: IntersectionObserverCallback) {
        this.callback = callback
        observers.push(this as unknown as FakeObserver)
      }
      observe(target: Element) {
        this.targets.push(target)
      }
    },
  )
  todayRect = rect(100, 200)
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    if (this.matches('main')) return rect(0, 1000)
    if (this.matches('.column-headers')) return rect(0, 50)
    if (this.matches('.day-row.is-today:not(.is-pinned)')) return todayRect
    if (this.matches('.day-row:not(.is-pinned)')) {
      const top = rowTops.shift() ?? 0
      return rect(top, top === 0 ? 0 : top + 50)
    }
    return rect(0, 0)
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CalendarView', () => {
  it('renders sticky column headers and 121 day rows (30 before today, 90 after)', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    expect([...container.querySelectorAll('.column-name')].map((h) => h.textContent)).toEqual(['Anna', 'Inne'])
    expect(rows(container)).toHaveLength(121)
    expect(await screen.findByText('Dzisiejsze')).toBeTruthy()
  })

  it('shows the event in the column of its tag', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const row = container.querySelector(`[data-day="${dayKey(today)}"]`)!
    expect(row.querySelector('.day-cell[data-column="a"] .event-title')?.textContent).toBe('Dzisiejsze')
    expect(row.querySelector('.day-cell[data-column="other"] .event')).toBeNull()
  })

  it('marks today and scrolls it into view on mount', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelector(`[data-day="${dayKey(today)}"]`)?.classList.contains('is-today')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))
  })

  it('shows an alert when events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing = portOf(vi.fn(async () => Promise.reject(new Error('offline'))))
    render(<CalendarView port={failing} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się pobrać wydarzeń.')
  })

  it('extends into the future when the bottom sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1])
    expect(rows(container)).toHaveLength(151)
  })

  it('extends into the past and keeps the same row where it was when the top sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    rowTops = [100, 100, 1800] // seen while looking for the anchor, when remembering it, and after the new days were added
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500 + 1700)
  })

  it('anchors on the first row when none is visible below the headers', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    todayRect = rect(-500, -400) // today is off screen too, so no row is below the headers
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500)
  })

  it('keeps the place when both ends are extended in the same update', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    rowTops = [100, 100, 1800]
    const observer = observers[0]
    act(() =>
      observer.callback(
        [
          { target: observer.targets[0], isIntersecting: true } as IntersectionObserverEntry,
          { target: observer.targets[1], isIntersecting: true } as IntersectionObserverEntry,
        ],
        observer as unknown as IntersectionObserver,
      ),
    )
    expect(rows(container)).toHaveLength(181)
    expect(main.scrollTop).toBe(500 + 1700)
  })

  it('ignores sentinels that are not intersecting', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1], false)
    expect(rows(container)).toHaveLength(121)
  })

  it('observes both sentinels inside the calendar and disconnects on unmount', async () => {
    const { container, unmount } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toHaveLength(2)
    expect(container.querySelector('main')?.contains(observers[0].targets[0])).toBe(true)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('shows the forecast in the row of its day only', async () => {
    const forecast: DayForecast = { day: dayKey(today), code: 0, tempMax: 20, tempMin: 10 }
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={new Map([[forecast.day, forecast]])} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelectorAll('.day-weather')).toHaveLength(1)
    expect(container.querySelector(`[data-day="${dayKey(today)}"] .day-weather`)?.textContent).toContain('20°/10°')
  })

  it('groups the days into month blocks with the month name as a label', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const blocks = [...container.querySelectorAll('.month-block')]
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    expect(blocks.reduce((sum, block) => sum + block.querySelectorAll('.day-row').length, 0)).toBe(121)
    for (const block of blocks) {
      const first = new Date(`${block.getAttribute('data-month')}-01T12:00:00`)
      expect(block.querySelector('.month-label')?.textContent).toBe(formatMonthLabel(first))
    }
  })

  describe('today pinned to the edge of the scroll area', () => {
    const renderCalendar = async () => {
      const view = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await screen.findByText('Dzisiejsze')
      return { ...view, main: view.container.querySelector('main')! }
    }
    const scrollTodayTo = (main: HTMLElement, top: number, bottom: number) => {
      todayRect = rect(top, bottom)
      act(() => {
        fireEvent.scroll(main)
      })
    }

    it('is not pinned while today is on screen', async () => {
      const { container } = await renderCalendar()
      expect(container.querySelector('.pin')).toBeNull()
    })

    it('pins a copy of today to the top once it has scrolled above the column headers', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, -500, -400)
      const pinned = container.querySelector('.pin-top .day-row.is-pinned.is-today')!
      expect(pinned).toBeTruthy()
      expect(pinned.hasAttribute('data-day')).toBe(false)
      expect(container.querySelector('.pin-bottom')).toBeNull()
      expect(screen.getByRole('button', { name: 'Wróć do dzisiejszego dnia' })).toBeTruthy()
    })

    it('pins a copy of today to the bottom once it is below the visible area', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, 1500, 1600)
      expect(container.querySelector('.pin-bottom .day-row.is-pinned.is-today')).toBeTruthy()
      expect(container.querySelector('.pin-top')).toBeNull()
    })

    it('keeps the pinned copy showing the day events', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, -500, -400)
      expect(container.querySelector('.pin-top .event-title')?.textContent).toBe('Dzisiejsze')
    })

    it('tolerates a few pixels of overlap at either edge', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, 47, 147)
      expect(container.querySelector('.pin')).toBeNull()
      scrollTodayTo(main, 900, 1003)
      expect(container.querySelector('.pin')).toBeNull()
    })

    it('drops the pinned copy when today is back on screen', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, -500, -400)
      scrollTodayTo(main, 100, 200)
      expect(container.querySelector('.pin')).toBeNull()
    })

    it('scrolls smoothly back to today, starting at that day, when the pinned copy is clicked', async () => {
      const { container, main } = await renderCalendar()
      scrollTodayTo(main, -500, -400)
      scrollIntoView.mockClear()
      fireEvent.click(screen.getByRole('button', { name: 'Wróć do dzisiejszego dnia' }))
      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
      expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`.day-row[data-day="${dayKey(today)}"]`))
    })

    it('stops listening for scrolls on unmount', async () => {
      const { main, unmount } = await renderCalendar()
      const remove = vi.spyOn(main, 'removeEventListener')
      unmount()
      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function))
    })
  })

  describe('adding and editing events', () => {
    const tomorrow = addDays(today, 1)
    const cell = (container: HTMLElement, day: Date, columnId: string) =>
      container.querySelector(`.day-row[data-day="${dayKey(day)}"] .day-cell[data-column="${columnId}"]`)!
    const pressed = (name: string) => screen.getByRole('button', { name }).getAttribute('aria-pressed')
    const field = (label: string) => screen.getByLabelText(label) as HTMLInputElement
    const renderEditable = async () => {
      const calendar = port()
      const view = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await screen.findByText('Dzisiejsze')
      return { calendar, ...view }
    }

    it('opens a new-event dialog for the clicked day with the column person preselected', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'a'))
      expect(screen.getByRole('dialog', { name: 'Nowe wydarzenie' })).toBeTruthy()
      expect(field('Data').value).toBe(dayKey(tomorrow))
      expect(pressed('Anna')).toBe('true')
    })

    it('preselects nobody for the "Inne" column', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'other'))
      expect(pressed('Anna')).toBe('false')
    })

    it('creates the event, closes the dialog and reloads the events', async () => {
      const { calendar, container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'a'))
      fireEvent.change(field('Tytuł'), { target: { value: 'Dentysta' } })
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(calendar.createEvent).toHaveBeenCalledTimes(1)
      expect(vi.mocked(calendar.createEvent).mock.calls[0][0]).toMatchObject({
        title: 'Dentysta',
        extendedProperties: { private: { fhcTags: 'anna' } },
      })
      await waitFor(() => expect(calendar.listEvents).toHaveBeenCalledTimes(2))
    })

    it('stays open and says so when the event cannot be stored', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      const { calendar, container } = await renderEditable()
      vi.mocked(calendar.createEvent).mockRejectedValueOnce(new Error('quota'))
      fireEvent.click(cell(container, tomorrow, 'a'))
      fireEvent.change(field('Tytuł'), { target: { value: 'Dentysta' } })
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
      expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się zapisać wydarzenia')
      expect(screen.getByRole('dialog')).toBeTruthy()
    })

    it('opens the same dialog filled in when an event is clicked, and does not open a new-event one', async () => {
      const { container } = await renderEditable()
      fireEvent.click(container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
      expect(screen.getByRole('dialog', { name: 'Edytuj wydarzenie' })).toBeTruthy()
      expect(field('Tytuł').value).toBe('Dzisiejsze')
      expect(field('Od').value).toBe('09:00')
      expect(pressed('Anna')).toBe('true')
      expect(screen.queryByRole('dialog', { name: 'Nowe wydarzenie' })).toBeNull()
    })

    it('updates the edited event keeping its id', async () => {
      const { calendar, container } = await renderEditable()
      fireEvent.click(container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
      fireEvent.change(field('Tytuł'), { target: { value: 'Zmienione' } })
      fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(calendar.updateEvent).toHaveBeenCalledTimes(1)
      expect(vi.mocked(calendar.updateEvent).mock.calls[0][0]).toMatchObject({ id: 'today', title: 'Zmienione' })
      expect(calendar.createEvent).not.toHaveBeenCalled()
    })

    it('deletes the edited event after confirmation, closes and reloads', async () => {
      const { calendar, container } = await renderEditable()
      fireEvent.click(container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
      fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
      fireEvent.click(screen.getByRole('button', { name: 'Na pewno usunąć?' }))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      expect(vi.mocked(calendar.deleteEvent).mock.calls[0][0].id).toBe('today')
      expect(vi.mocked(calendar.deleteEvent).mock.calls[0][1]).toBe('occurrence')
      await waitFor(() => expect(calendar.listEvents).toHaveBeenCalledTimes(2))
    })

    describe('a recurring event', () => {
      const recurring: CalendarEvent = { ...todayEvent, id: 'cal|series_20261018', recurringEventId: 'cal|series' }
      const open = async () => {
        const calendar = portOf(vi.fn(async () => [recurring]))
        const view = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
        await screen.findByText('Dzisiejsze')
        fireEvent.click(view.container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
        return calendar
      }

      it('says that an edit changes only this occurrence', async () => {
        await open()
        expect(screen.getByText('To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.')).toBeTruthy()
      })

      it('deletes only this occurrence when asked to', async () => {
        const calendar = await open()
        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
        fireEvent.click(screen.getByRole('button', { name: 'Usuń to wystąpienie' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(vi.mocked(calendar.deleteEvent).mock.calls[0][1]).toBe('occurrence')
      })

      it('deletes the whole series when asked to', async () => {
        const calendar = await open()
        fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
        fireEvent.click(screen.getByRole('button', { name: 'Usuń całą serię' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(vi.mocked(calendar.deleteEvent).mock.calls[0][0].id).toBe('cal|series_20261018')
        expect(vi.mocked(calendar.deleteEvent).mock.calls[0][1]).toBe('series')
      })
    })

    it('closes without saving on cancel', async () => {
      const { calendar, container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'a'))
      fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(calendar.createEvent).not.toHaveBeenCalled()
    })

    it('gives each opened dialog fresh form state', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'a'))
      fireEvent.change(field('Tytuł'), { target: { value: 'Pierwsze' } })
      fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
      fireEvent.click(cell(container, tomorrow, 'other'))
      expect(field('Tytuł').value).toBe('')
    })
  })

  it('reloads the events when the refresh signal changes, keeping the old ones until the new arrive', async () => {
    const listEvents = vi
      .fn<CalendarPort['listEvents']>()
      .mockResolvedValueOnce([todayEvent])
      .mockResolvedValueOnce([{ ...todayEvent, title: 'Nowe #anna' }])
    const calendar = portOf(listEvents)
    const { rerender } = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    rerender(<CalendarView port={calendar} members={members} refreshSignal={1} forecasts={noForecasts} hourForecasts={noHours} />)
    expect(await screen.findByText('Nowe')).toBeTruthy()
    expect(screen.queryByText('Dzisiejsze')).toBeNull()
    expect(listEvents).toHaveBeenCalledTimes(2)
  })

  describe('hour view of one expanded day', () => {
    const tomorrow = addDays(today, 1)
    const dayAfter = addDays(today, 2)
    const rowOf = (container: HTMLElement, day: Date) => container.querySelector(`.day-row[data-day="${dayKey(day)}"]`)!
    const expandedDays = (container: HTMLElement) =>
      [...container.querySelectorAll('.day-row.is-expanded')].map((row) => row.getAttribute('data-day'))
    const toggle = (container: HTMLElement, day: Date) => fireEvent.click(rowOf(container, day).querySelector('button.day-date')!)
    const renderAt = async (time: Date, listEvents: CalendarEvent[] = [todayEvent]) => {
      vi.setSystemTime(time)
      const view = render(<CalendarView port={portOf(vi.fn(async () => listEvents))} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await screen.findByText(listEvents[0].title.replace(' #anna', ''))
      return view
    }

    it('expands today by default and draws its event on the hour grid with the now-line', async () => {
      const { container } = await renderAt(atTime(12))
      expect(expandedDays(container)).toEqual([dayKey(today)])
      expect(rowOf(container, today).querySelector('.hour-track[data-column="a"] .event.is-timed .event-title')?.textContent).toBe('Dzisiejsze')
      expect(rowOf(container, today).querySelector('.now-line')).toBeTruthy()
      expect(rowOf(container, tomorrow).querySelector('.hour-body')).toBeNull()
    })

    it('shows the forecast of every hour of the expanded day only', async () => {
      const at = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour)
      const hours = new Map([8, 9, 10].map((hour) => [at(hour).getTime(), { time: at(hour), code: 0, temp: hour + 0.4 }]))
      vi.setSystemTime(atTime(12))
      const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={hours} />)
      await screen.findByText('Dzisiejsze')
      expect([...container.querySelectorAll('.hour-weather')].map((node) => node.textContent)).toEqual(['☀️8°', '☀️9°', '☀️10°'])
    })

    it('expands the next day once nothing is left of today after 20:00', async () => {
      const { container } = await renderAt(atTime(20, 5))
      expect(expandedDays(container)).toEqual([dayKey(tomorrow)])
    })

    it('keeps today expanded after 20:00 while an evening event is still going on', async () => {
      const evening: CalendarEvent = { ...todayEvent, id: 'evening', title: 'Wieczorem #anna', start: atTime(21), end: atTime(22) }
      const { container } = await renderAt(atTime(20, 30), [evening])
      expect(expandedDays(container)).toEqual([dayKey(today)])
      expect(rowOf(container, today).querySelectorAll('.hour-label')).toHaveLength(15)
    })

    it('expands the clicked day, collapsing the one that was open', async () => {
      const { container } = await renderAt(atTime(12))
      toggle(container, tomorrow)
      expect(expandedDays(container)).toEqual([dayKey(tomorrow)])
      toggle(container, dayAfter)
      expect(expandedDays(container)).toEqual([dayKey(dayAfter)])
    })

    it('collapses the open day when its date is clicked, and expands it again on the next click', async () => {
      const { container } = await renderAt(atTime(12))
      toggle(container, today)
      expect(expandedDays(container)).toEqual([])
      expect(rowOf(container, today).querySelector('.day-date')?.getAttribute('aria-expanded')).toBe('false')
      expect(rowOf(container, today).querySelector('.day-cell[data-column="a"] .event-title')?.textContent).toBe('Dzisiejsze')
      toggle(container, today)
      expect(expandedDays(container)).toEqual([dayKey(today)])
    })

    it('forgets the choice when the next day begins', async () => {
      vi.useRealTimers()
      vi.useFakeTimers()
      vi.setSystemTime(atTime(23, 30))
      const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await act(() => vi.advanceTimersByTimeAsync(0))
      toggle(container, addDays(today, 2))
      expect(expandedDays(container)).toEqual([dayKey(addDays(today, 2))])
      // Step by step, as in real time: each tick of the clock is rendered before the next one is scheduled.
      for (let step = 0; step < 35; step++) await act(() => vi.advanceTimersByTimeAsync(60_000))
      expect(expandedDays(container)).toEqual([dayKey(tomorrow)])
    })

    it('does not offer expanding on the pinned copy of today', async () => {
      const { container, ...view } = await renderAt(atTime(12))
      todayRect = rect(-500, -400)
      act(() => {
        fireEvent.scroll(container.querySelector('main')!)
      })
      expect(container.querySelector('.pin-top button.day-date')).toBeNull()
      expect(container.querySelector('.pin-top .hour-body')).toBeNull()
      view.unmount()
    })

    describe('the home button', () => {
      const home = () => screen.getByRole('button', { name: 'Wróć do widoku początkowego' })

      it('restores today as the only expanded day and scrolls to it', async () => {
        const { container } = await renderAt(atTime(12))
        toggle(container, dayAfter)
        scrollIntoView.mockClear()
        fireEvent.click(home())
        expect(expandedDays(container)).toEqual([dayKey(today)])
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
        expect(scrollIntoView.mock.contexts[0]).toBe(rowOf(container, today))
      })

      it('also restores the default after today was collapsed, and scrolls again on a second press', async () => {
        const { container } = await renderAt(atTime(12))
        toggle(container, today)
        fireEvent.click(home())
        expect(expandedDays(container)).toEqual([dayKey(today)])
        scrollIntoView.mockClear()
        fireEvent.click(home())
        expect(scrollIntoView).toHaveBeenCalledTimes(1)
      })

      it('goes to the next day when that one is the default', async () => {
        const { container } = await renderAt(atTime(21))
        toggle(container, today)
        scrollIntoView.mockClear()
        fireEvent.click(home())
        expect(expandedDays(container)).toEqual([dayKey(tomorrow)])
        expect(scrollIntoView.mock.contexts[0]).toBe(rowOf(container, tomorrow))
      })
    })
  })
})
