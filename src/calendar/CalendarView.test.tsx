import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { CalendarView } from './CalendarView'
import { formatMonthLabel } from '../shared/format'
import { addDays, dayKey } from './days'
import type { DayForecast } from '../weather/types'
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

beforeEach(() => {
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
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CalendarView', () => {
  it('renders sticky column headers and 121 day rows (30 before today, 90 after)', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    expect([...container.querySelectorAll('.column-name')].map((h) => h.textContent)).toEqual(['Anna', 'Inne'])
    expect(rows(container)).toHaveLength(121)
    expect(await screen.findByText('Dzisiejsze')).toBeTruthy()
  })

  it('shows the event in the column of its tag', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const row = container.querySelector(`[data-day="${dayKey(today)}"]`)!
    expect(row.querySelector('.day-cell[data-column="a"] .event-title')?.textContent).toBe('Dzisiejsze')
    expect(row.querySelector('.day-cell[data-column="other"] .event')).toBeNull()
  })

  it('marks today and scrolls it into view on mount', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelector(`[data-day="${dayKey(today)}"]`)?.classList.contains('is-today')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))
  })

  it('shows an alert when events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing = portOf(vi.fn(async () => Promise.reject(new Error('offline'))))
    render(<CalendarView port={failing} members={members} refreshSignal={0} forecasts={noForecasts} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się pobrać wydarzeń.')
  })

  it('extends into the future when the bottom sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1])
    expect(rows(container)).toHaveLength(151)
  })

  it('extends into the past and keeps the same row where it was when the top sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    rowTops = [100, 100, 1800] // seen while looking for the anchor, when remembering it, and after the new days were added
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500 + 1700)
  })

  it('anchors on the first row when none is visible below the headers', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    todayRect = rect(-500, -400) // today is off screen too, so no row is below the headers
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(151)
    expect(main.scrollTop).toBe(500)
  })

  it('keeps the place when both ends are extended in the same update', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
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
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1], false)
    expect(rows(container)).toHaveLength(121)
  })

  it('observes both sentinels inside the calendar and disconnects on unmount', async () => {
    const { container, unmount } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toHaveLength(2)
    expect(container.querySelector('main')?.contains(observers[0].targets[0])).toBe(true)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('shows the forecast in the row of its day only', async () => {
    const forecast: DayForecast = { day: dayKey(today), code: 0, tempMax: 20, tempMin: 10 }
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={new Map([[forecast.day, forecast]])} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelectorAll('.day-weather')).toHaveLength(1)
    expect(container.querySelector(`[data-day="${dayKey(today)}"] .day-weather`)?.textContent).toContain('20°/10°')
  })

  it('groups the days into month blocks with the month name as a label', async () => {
    const { container } = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
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
      const view = render(<CalendarView port={port()} members={members} refreshSignal={0} forecasts={noForecasts} />)
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
      const view = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} />)
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
        const view = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} />)
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
    const { rerender } = render(<CalendarView port={calendar} members={members} refreshSignal={0} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    rerender(<CalendarView port={calendar} members={members} refreshSignal={1} forecasts={noForecasts} />)
    expect(await screen.findByText('Nowe')).toBeTruthy()
    expect(screen.queryByText('Dzisiejsze')).toBeNull()
    expect(listEvents).toHaveBeenCalledTimes(2)
  })
})
