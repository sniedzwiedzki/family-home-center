import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { CalendarView } from './CalendarView'
import { dayKey } from './days'
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

const today = new Date()
const todayEvent: CalendarEvent = {
  id: 'today',
  title: 'Dzisiejsze #anna',
  allDay: false,
  start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9),
  end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10),
}
const port = (): CalendarPort => ({ listEvents: vi.fn(async () => [todayEvent]) })

const rows = (container: HTMLElement) => container.querySelectorAll('.day-row')

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
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, get: () => scrollHeights.shift() ?? 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('CalendarView', () => {
  it('renders sticky column headers and 61 day rows around today', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    expect([...container.querySelectorAll('.column-header')].map((h) => h.textContent)).toEqual(['Anna', 'Inne'])
    expect(rows(container)).toHaveLength(61)
    expect(await screen.findByText('Dzisiejsze')).toBeTruthy()
  })

  it('shows the event in the column of its tag', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    const row = container.querySelector(`[data-day="${dayKey(today)}"]`)!
    expect(row.querySelector('.day-cell[data-column="a"] .event-title')?.textContent).toBe('Dzisiejsze')
    expect(row.querySelector('.day-cell[data-column="other"] .event')).toBeNull()
  })

  it('marks today and scrolls it into view on mount', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    expect(container.querySelector(`[data-day="${dayKey(today)}"]`)?.classList.contains('is-today')).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'start' })
    expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector(`[data-day="${dayKey(today)}"]`))
  })

  it('shows an alert when events cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failing: CalendarPort = { listEvents: vi.fn(async () => Promise.reject(new Error('offline'))) }
    render(<CalendarView port={failing} members={members} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się pobrać wydarzeń.')
  })

  it('extends into the future when the bottom sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1])
    expect(rows(container)).toHaveLength(91)
  })

  it('extends into the past and keeps the scroll position when the top sentinel becomes visible', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    const main = container.querySelector('main')!
    main.scrollTop = 500
    scrollHeights = [1000, 2600]
    intersect(observers[0].targets[0])
    expect(rows(container)).toHaveLength(91)
    expect(main.scrollTop).toBe(500 + 1600)
  })

  it('ignores sentinels that are not intersecting', async () => {
    const { container } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    intersect(observers[0].targets[1], false)
    expect(rows(container)).toHaveLength(61)
  })

  it('observes both sentinels inside the calendar and disconnects on unmount', async () => {
    const { container, unmount } = render(<CalendarView port={port()} members={members} />)
    await screen.findByText('Dzisiejsze')
    expect(observers).toHaveLength(1)
    expect(observers[0].targets).toHaveLength(2)
    expect(container.querySelector('main')?.contains(observers[0].targets[0])).toBe(true)
    unmount()
    expect(observers[0].disconnect).toHaveBeenCalledTimes(1)
  })
})
