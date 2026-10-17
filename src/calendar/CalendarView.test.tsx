import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { CalendarView } from './CalendarView'
import { formatMonthLabel } from '../shared/format'
import { dayKey } from './days'
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
let scrollHeights: number[]
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
const port = (): CalendarPort => ({ listEvents: vi.fn(async () => [todayEvent]) })

const rows = (container: HTMLElement) => container.querySelectorAll('.day-row')

const rect = (top: number, bottom: number) =>
  ({ top, bottom, height: bottom - top, left: 0, right: 0, width: 0, x: 0, y: top, toJSON: () => ({}) }) as DOMRect

function intersect(target: Element | undefined, isIntersecting = true) {
  const observer = observers[0]
  act(() => observer.callback([{ target, isIntersecting } as IntersectionObserverEntry], observer as unknown as IntersectionObserver))
}

beforeEach(() => {
  observers = []
  scrollHeights = []
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
    return rect(0, 0)
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeights.shift() ?? 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CalendarView', () => {
  it('renders sticky column headers and 61 day rows around today', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    expect([...container.querySelectorAll('.column-name')].map((h) => h.textContent)).toEqual(['Anna', 'Inne'])
    expect(rows(container)).toHaveLength(61)
    expect(await screen.findByText('Dzisiejsze')).toBeTruthy()
  })

  it('shows the event in the column of its tag', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const row = container.querySelector(`[data-day="${dayKey(today)}"]`)!
    expect(row.querySelector('.day-cell[data-column="a"] .event-title')?.textContent).toBe('Dzisiejsze')
    expect(row.querySelector('.day-cell[data-column="other"] .event')).toBeNull()
  })

  it('marks today and scrolls it into view on mount', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelector(`[data-day="${dayKey(today)}"]`)?.classList.contains('is-today')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))
  })

  it('shows an alert when events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing: CalendarPort = { listEvents: vi.fn(async () => Promise.reject(new Error('offline'))) }
    render(<CalendarView port={failing} members={members} forecasts={noForecasts} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się pobrać wydarzeń.')
  })

  it('extends into the future when the bottom sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1])
    expect(rows(container)).toHaveLength(91)
  })

  it('extends into the past and keeps the scroll position when the top sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    scrollHeights = [1000, 2600]
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(91)
    expect(main.scrollTop).toBe(500 + 1600)
  })

  it('ignores sentinels that are not intersecting', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1], false)
    expect(rows(container)).toHaveLength(61)
  })

  it('observes both sentinels inside the calendar and disconnects on unmount', async () => {
    const { container, unmount } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toHaveLength(2)
    expect(container.querySelector('main')?.contains(observers[0].targets[0])).toBe(true)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })

  it('shows the forecast in the row of its day only', async () => {
    const forecast: DayForecast = { day: dayKey(today), code: 0, tempMax: 20, tempMin: 10 }
    const { container } = render(<CalendarView port={port()} members={members} forecasts={new Map([[forecast.day, forecast]])} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelectorAll('.day-weather')).toHaveLength(1)
    expect(container.querySelector(`[data-day="${dayKey(today)}"] .day-weather`)?.textContent).toContain('20°/10°')
  })

  it('groups the days into month blocks with the month name as a label', async () => {
    const { container } = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
    await screen.findByText('Dzisiejsze')
    const blocks = [...container.querySelectorAll('.month-block')]
    expect(blocks.length).toBeGreaterThanOrEqual(2)
    expect(blocks.reduce((sum, block) => sum + block.querySelectorAll('.day-row').length, 0)).toBe(61)
    for (const block of blocks) {
      const first = new Date(`${block.getAttribute('data-month')}-01T12:00:00`)
      expect(block.querySelector('.month-label')?.textContent).toBe(formatMonthLabel(first))
    }
  })

  describe('today pinned to the edge of the scroll area', () => {
    const renderCalendar = async () => {
      const view = render(<CalendarView port={port()} members={members} forecasts={noForecasts} />)
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
})
