import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { CalendarView } from './CalendarView'
import { DEFAULT_COLUMN_LAYOUT } from './columns'
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
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    expect([...container.querySelectorAll('.column-name')].map((h) => h.textContent)).toEqual(['Anna'])
    expect(container.querySelector<HTMLElement>('.calendar')!.style.getPropertyValue('--column-template')).toBe('minmax(0, 3fr) minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.5fr)')
    expect(rows(container)).toHaveLength(121)
    expect(await screen.findByText('Dzisiejsze')).toBeTruthy()
  })

  it('shows a family event in "Wszystkie"', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const row = container.querySelector(`[data-day="${dayKey(today)}"]`)!
    expect(row.querySelector('.day-cell[data-column="all"] .event-title')?.textContent).toBe('Dzisiejsze')
    expect(row.querySelector('.day-cell[data-column="other"] .event')).toBeNull()
  })

  it('puts the occurrences of a weekly series in "Powtarzalne" and a work event in "Praca"', async () => {
    const at = (dayOffset: number, hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, hour)
    const weekly = (dayOffset: number): CalendarEvent => ({ id: `basen-${dayOffset}`, recurringEventId: 'basen', title: 'Basen #anna', allDay: false, start: at(dayOffset, 17), end: at(dayOffset, 18) })
    const work: CalendarEvent = { ...todayEvent, id: 'work', title: 'Spotkanie #anna #praca' }
    const { container } = render(
      <CalendarView port={portOf(vi.fn(async () => [weekly(0), weekly(7), work]))} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />,
    )
    await screen.findByText('Spotkanie')
    const titlesIn = (dayOffset: number, columnId: string) =>
      [...container.querySelectorAll(`.day-row[data-day="${dayKey(at(dayOffset, 0))}"] .day-cell[data-column="${columnId}"] .event-title`)].map((title) => title.textContent)
    expect(titlesIn(0, 'recurring')).toEqual(['Basen'])
    expect(titlesIn(7, 'recurring')).toEqual(['Basen'])
    expect(titlesIn(0, 'work')).toEqual(['Spotkanie'])
    expect(titlesIn(0, 'all')).toEqual([])
  })

  it('marks today and scrolls it into view on mount', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelector(`[data-day="${dayKey(today)}"]`)?.classList.contains('is-today')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))
  })

  it('keeps today at the top when events load later, until the calendar is scrolled', async () => {
    let resolveEvents: (events: CalendarEvent[]) => void = () => undefined
    const slow = portOf(vi.fn(() => new Promise<CalendarEvent[]>((resolve) => (resolveEvents = resolve))))
    const view = (refreshSignal: number) => <CalendarView port={slow} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={refreshSignal} forecasts={noForecasts} hourForecasts={noHours} />
    const { container, rerender } = render(view(0))
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    resolveEvents([todayEvent])
    await screen.findByText('Dzisiejsze')
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView.mock.contexts[1]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))

    // Someone scrolls: from now on the view stays where it is.
    Object.defineProperty(container.querySelector('main')!, 'scrollTop', { value: 500, configurable: true })
    scrollIntoView.mockClear()
    rerender(view(1))
    resolveEvents([{ ...todayEvent, id: 'later', title: 'Później #anna' }])
    await screen.findByText('Później')
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('shows an alert when events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing = portOf(vi.fn(async () => Promise.reject(new Error('offline'))))
    render(<CalendarView port={failing} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się pobrać wydarzeń.')
  })

  it('extends into the future when the bottom sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1])
    expect(rows(container)).toHaveLength(151)
  })

  it('extends into the past and keeps the same row where it was when the top sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    rowTops = [100, 100, 1800] // seen while looking for the anchor, when remembering it, and after the new days were added
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500 + 1700)
  })

  it('anchors on the first row when none is visible below the headers', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    todayRect = rect(-500, -400) // today is off screen too, so no row is below the headers
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500)
  })

  it('keeps the place when both ends are extended in the same update', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
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
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1], false)
    expect(rows(container)).toHaveLength(121)
  })

  it('observes both sentinels inside the calendar and disconnects on unmount', async () => {
    const { container, unmount } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toHaveLength(2)
    expect(container.querySelector('main')?.contains(observers[0].targets[0])).toBe(true)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('shows the forecast in the row of its day only', async () => {
    const forecast: DayForecast = { day: dayKey(today), code: 0, tempMax: 20, tempMin: 10 }
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={new Map([[forecast.day, forecast]])} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelectorAll('.day-weather')).toHaveLength(1)
    expect(container.querySelector(`[data-day="${dayKey(today)}"] .day-weather`)?.textContent).toContain('20°/10°')
  })

  it('groups the days into month blocks with the month name as a label', async () => {
    const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
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
      const view = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
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
      const view = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await screen.findByText('Dzisiejsze')
      return { calendar, ...view }
    }

    it('opens a new-event dialog for the clicked day with nobody preselected', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'all'))
      expect(screen.getByRole('dialog', { name: 'Nowe wydarzenie' })).toBeTruthy()
      expect(field('Data').value).toBe(dayKey(tomorrow))
      expect(pressed('Anna')).toBe('false')
      expect(field('Praca').checked).toBe(false)
    })

    it('ticks "Praca" for a new event from the "Praca" column', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'work'))
      expect(field('Praca').checked).toBe(true)
    })

    it('creates the event, closes the dialog and reloads the events', async () => {
      const { calendar, container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'all'))
      fireEvent.click(screen.getByRole('button', { name: 'Anna' }))
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
      fireEvent.click(cell(container, tomorrow, 'all'))
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

    describe('repeating', () => {
      const withSeries = (): CalendarPort => ({ ...port(), series: { loadRule: vi.fn(), update: vi.fn() } })

      it('offers no repeat controls without Google', async () => {
        const { container } = await renderEditable()
        fireEvent.click(cell(container, tomorrow, 'all'))
        expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
      })

      it('creates a repeating event with its rule', async () => {
        const calendar = withSeries()
        const { container } = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
        await screen.findByText('Dzisiejsze')
        fireEvent.click(cell(container, tomorrow, 'all'))
        fireEvent.change(field('Tytuł'), { target: { value: 'Basen' } })
        fireEvent.change(screen.getByLabelText('Powtarzaj'), { target: { value: 'weekly' } })
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        expect(vi.mocked(calendar.createEvent).mock.calls[0][0].recurrence).toEqual({ frequency: 'weekly', weekdays: [], until: null })
      })

      it('makes an existing single event repeat', async () => {
        const calendar = withSeries()
        const { container } = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
        await screen.findByText('Dzisiejsze')
        fireEvent.click(container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
        fireEvent.change(screen.getByLabelText('Powtarzaj'), { target: { value: 'yearly' } })
        fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
        await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
        const [event, recurrence] = vi.mocked(calendar.updateEvent).mock.calls[0]
        expect(event).toMatchObject({ id: 'today' })
        expect('recurrence' in event).toBe(false)
        expect(recurrence).toEqual({ frequency: 'yearly', weekdays: [], until: null })
      })
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
        const view = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
        await screen.findByText('Dzisiejsze')
        fireEvent.click(view.container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
        return calendar
      }

      it('says that an edit changes only this occurrence', async () => {
        await open()
        expect(screen.getByText('To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.')).toBeTruthy()
      })

      describe('with Google (series editing)', () => {
        const rule = { frequency: 'weekly' as const, weekdays: [], until: null }
        const openWithSeries = async () => {
          const calendar: CalendarPort = {
            ...portOf(vi.fn(async () => [recurring])),
            series: { loadRule: vi.fn(async () => rule), update: vi.fn(async () => undefined) },
          }
          const view = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
          await screen.findByText('Dzisiejsze')
          fireEvent.click(view.container.querySelector(`.day-row[data-day="${dayKey(today)}"] .event`)!)
          return calendar
        }

        it('saves an edit of the occurrence alone, without touching the series', async () => {
          const calendar = await openWithSeries()
          fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Tylko dziś' } })
          fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
          await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
          expect(calendar.updateEvent).toHaveBeenCalledTimes(1)
          expect(vi.mocked(calendar.updateEvent).mock.calls[0][0]).toMatchObject({ id: 'cal|series_20261018', title: 'Tylko dziś' })
          expect(vi.mocked(calendar.updateEvent).mock.calls[0][1]).toBeUndefined()
          expect(calendar.series!.update).not.toHaveBeenCalled()
        })

        it('saves an edit of the whole series with its rule, then closes and reloads', async () => {
          const calendar = await openWithSeries()
          fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
          fireEvent.change(await screen.findByLabelText('Powtarzaj'), { target: { value: 'monthly' } })
          fireEvent.change(screen.getByLabelText('Tytuł'), { target: { value: 'Cała seria' } })
          fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
          await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
          expect(calendar.updateEvent).not.toHaveBeenCalled()
          const [occurrence, input, keepRule] = vi.mocked(calendar.series!.update).mock.calls[0]
          expect(occurrence.id).toBe('cal|series_20261018')
          expect(input).toMatchObject({ title: 'Cała seria', recurrence: { frequency: 'monthly', weekdays: [], until: null } })
          expect(keepRule).toBe(false)
          await waitFor(() => expect(calendar.listEvents).toHaveBeenCalledTimes(2))
        })
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
      fireEvent.click(cell(container, tomorrow, 'all'))
      fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
      expect(screen.queryByRole('dialog')).toBeNull()
      expect(calendar.createEvent).not.toHaveBeenCalled()
    })

    it('gives each opened dialog fresh form state', async () => {
      const { container } = await renderEditable()
      fireEvent.click(cell(container, tomorrow, 'all'))
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
    const { rerender } = render(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
    await screen.findByText('Dzisiejsze')
    rerender(<CalendarView port={calendar} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={1} forecasts={noForecasts} hourForecasts={noHours} />)
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
      const view = render(<CalendarView port={portOf(vi.fn(async () => listEvents))} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await screen.findByText(listEvents[0].title.replace(' #anna', ''))
      return view
    }

    it('expands no day by default', async () => {
      const { container } = await renderAt(atTime(12))
      expect(expandedDays(container)).toEqual([])
      expect(rowOf(container, today).querySelector('.day-cell[data-column="all"] .event-title')?.textContent).toBe('Dzisiejsze')
    })

    it('expands a day on demand and draws its event on the hour grid with the now-line', async () => {
      const { container } = await renderAt(atTime(12))
      toggle(container, today)
      expect(expandedDays(container)).toEqual([dayKey(today)])
      expect(rowOf(container, today).querySelector('.hour-track[data-column="all"] .event.is-timed .event-title')?.textContent).toBe('Dzisiejsze')
      expect(rowOf(container, today).querySelector('.now-line')).toBeTruthy()
      expect(rowOf(container, tomorrow).querySelector('.hour-body')).toBeNull()
    })

    it('stays collapsed after 20:00, with no automatic switch to the next day', async () => {
      const { container } = await renderAt(atTime(20, 5))
      expect(expandedDays(container)).toEqual([])
    })

    it('opens the new-event dialog at the hour that was clicked in the hour view', async () => {
      const { container } = await renderAt(atTime(12))
      toggle(container, today)
      const track = rowOf(container, today).querySelector<HTMLElement>('.hour-track[data-column="all"]')!
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 1300 } as DOMRect)
      fireEvent.click(track, { clientY: 750 })
      expect((screen.getByLabelText('Od') as HTMLInputElement).value).toBe('14:00')
      expect((screen.getByLabelText('Do') as HTMLInputElement).value).toBe('15:00')
    })

    it('shows the forecast of every hour of the expanded day only', async () => {
      const at = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour)
      const hours = new Map([8, 9, 10].map((hour) => [at(hour).getTime(), { time: at(hour), code: 0, temp: hour + 0.4 }]))
      vi.setSystemTime(atTime(12))
      const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={hours} />)
      await screen.findByText('Dzisiejsze')
      toggle(container, today)
      expect([...container.querySelectorAll('.hour-weather')].map((node) => node.textContent)).toEqual(['☀️8°', '☀️9°', '☀️10°'])
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
      expect(expandedDays(container)).toEqual([dayKey(today)])
      expect(rowOf(container, today).querySelector('.day-date')?.getAttribute('aria-expanded')).toBe('true')
      toggle(container, today)
      expect(expandedDays(container)).toEqual([])
      expect(rowOf(container, today).querySelector('.day-date')?.getAttribute('aria-expanded')).toBe('false')
      expect(rowOf(container, today).querySelector('.day-cell[data-column="all"] .event-title')?.textContent).toBe('Dzisiejsze')
    })

    it('forgets the choice when the next day begins', async () => {
      vi.useRealTimers()
      vi.useFakeTimers()
      vi.setSystemTime(atTime(23, 30))
      const { container } = render(<CalendarView port={port()} members={members} columnLayout={DEFAULT_COLUMN_LAYOUT} refreshSignal={0} forecasts={noForecasts} hourForecasts={noHours} />)
      await act(() => vi.advanceTimersByTimeAsync(0))
      toggle(container, addDays(today, 2))
      expect(expandedDays(container)).toEqual([dayKey(addDays(today, 2))])
      // Step by step, as in real time: each tick of the clock is rendered before the next one is scheduled.
      for (let step = 0; step < 35; step++) await act(() => vi.advanceTimersByTimeAsync(60_000))
      expect(expandedDays(container)).toEqual([])
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

      it('collapses the expanded day and scrolls to today', async () => {
        const { container } = await renderAt(atTime(12))
        toggle(container, dayAfter)
        scrollIntoView.mockClear()
        fireEvent.click(home())
        expect(expandedDays(container)).toEqual([])
        expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'smooth' })
        expect(scrollIntoView.mock.contexts[0]).toBe(rowOf(container, today))
      })

      it('scrolls again on a second press when nothing was expanded', async () => {
        const { container } = await renderAt(atTime(12))
        fireEvent.click(home())
        expect(expandedDays(container)).toEqual([])
        scrollIntoView.mockClear()
        fireEvent.click(home())
        expect(scrollIntoView).toHaveBeenCalledTimes(1)
      })
    })
  })
})
