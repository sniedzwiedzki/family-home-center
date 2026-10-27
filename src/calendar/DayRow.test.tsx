import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns, columnForEvent, DEFAULT_COLUMN_LAYOUT } from './columns'
import { DayRow } from './DayRow'
import type { DayForecast, HourForecast } from '../weather/types'
import type { CalendarEvent } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]
const columns = buildColumns(DEFAULT_COLUMN_LAYOUT)
const columnOf = (item: CalendarEvent) => columnForEvent(item, members, 'praca', new Set())
const noop = () => undefined
const day = new Date(2026, 9, 17)
const event = (id: string, title: string): CalendarEvent => ({ id, title, allDay: true, start: day, end: new Date(2026, 9, 18) })
const entry = (id: string, title: string) => ({ event: event(id, title), isContinuation: false })

const cellTitles = (container: HTMLElement, columnId: string) =>
  [...container.querySelectorAll(`.day-cell[data-column="${columnId}"] .event-title`)].map((node) => node.textContent)

describe('DayRow', () => {
  it('shows the date number and the two-letter weekday, and the day key', () => {
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={new Date(2026, 9, 25)} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect(container.querySelector('.day-number')?.textContent).toBe('25')
    expect(container.querySelector('.day-weekday')?.textContent).toBe('nd')
    expect(container.querySelector('.day-row')?.getAttribute('data-day')).toBe('2026-10-25')
  })

  it('styles every Saturday and every Sunday differently and Monday to Friday alike', () => {
    const classesOf = (date: Date) => {
      const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={date} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
      return container.querySelector('.day-row')?.className
    }
    const week = Array.from({ length: 7 }, (_, i) => classesOf(new Date(2026, 9, 12 + i)))
    expect(new Set(week.slice(0, 5)).size).toBe(1)
    expect(week[0]).toBe('day-row day-grid')
    expect(week[5]).toBe('day-row day-grid is-saturday')
    expect(week[6]).toBe('day-row day-grid is-sunday')
    expect(classesOf(new Date(2026, 9, 24))).toBe(week[5])
    expect(classesOf(new Date(2026, 9, 25))).toBe(week[6])
  })

  it('marks today', () => {
    const today = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect(today.container.querySelector('.day-row')?.classList.contains('is-today')).toBe(true)
    expect(today.container.querySelector('.day-row')?.classList.contains('is-saturday')).toBe(true)
    const other = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect(other.container.querySelector('.day-row')?.classList.contains('is-today')).toBe(false)
  })

  it('renders one cell per column', () => {
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect([...container.querySelectorAll('.day-cell')].map((cell) => cell.getAttribute('data-column'))).toEqual(['all', 'recurring', 'work', 'other'])
  })

  it('puts each event in the one column it belongs to', () => {
    const entries = [entry('1', 'Trening #anna'), entry('2', 'Spotkanie #jan #praca'), entry('3', 'Śmieci')]
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={entries} />)
    expect(cellTitles(container, 'all')).toEqual(['Trening'])
    expect(cellTitles(container, 'work')).toEqual(['Spotkanie'])
    expect(cellTitles(container, 'other')).toEqual(['Śmieci'])
    expect(cellTitles(container, 'recurring')).toEqual([])
  })

  it('colours a chip with its person, with stripes for several people, and leaves an event of nobody grey', () => {
    const entries = [entry('1', 'Trening #anna'), entry('2', 'Kino #anna #jan'), entry('3', 'Śmieci')]
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={entries} />)
    const [single, shared] = container.querySelectorAll<HTMLElement>('.day-cell[data-column="all"] .event')
    expect(single.style.getPropertyValue('--event-color')).toBe('#ff0000')
    expect(single.classList.contains('is-shared')).toBe(false)
    expect(shared.classList.contains('is-shared')).toBe(true)
    expect(container.querySelector<HTMLElement>('.day-cell[data-column="other"] .event')!.style.getPropertyValue('--event-color')).toBe('')
  })

  it('shows the forecast under the day label when there is one', () => {
    const forecast: DayForecast = { day: '2026-10-17', code: 0, tempMax: 20, tempMin: 10 }
    const withForecast = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} forecast={forecast} />)
    expect(withForecast.container.querySelector('.day-label .day-weather')).toBeTruthy()
    const without = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect(without.container.querySelector('.day-weather')).toBeNull()
  })

  it('marks a pinned copy and leaves out the day key so it cannot be mistaken for the real row', () => {
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday pinned columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    const row = container.querySelector('.day-row')!
    expect(row.classList.contains('is-pinned')).toBe(true)
    expect(row.hasAttribute('data-day')).toBe(false)
  })

  it('is not pinned by default', () => {
    const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday columns={columns} members={members} columnOf={columnOf} entries={[]} />)
    expect(container.querySelector('.day-row')?.classList.contains('is-pinned')).toBe(false)
  })

  it('reports a click on a cell with the day and the column, without the click reaching the row behind it', () => {
    const onAddEvent = vi.fn()
    const rowClick = vi.fn()
    const { container } = render(
      <div onClick={rowClick}>
        <DayRow day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} onAddEvent={onAddEvent} onEditEvent={noop} />
      </div>,
    )
    fireEvent.click(container.querySelector('.day-cell[data-column="work"]')!)
    expect(onAddEvent).toHaveBeenCalledWith(day, 'work')
    fireEvent.click(container.querySelector('.day-cell[data-column="other"]')!)
    expect(onAddEvent).toHaveBeenLastCalledWith(day, 'other')
    expect(rowClick).not.toHaveBeenCalled()
  })

  it('reports an event to edit and does not treat the click as adding one', () => {
    const onAddEvent = vi.fn()
    const onEditEvent = vi.fn()
    const { container } = render(
      <DayRow day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[entry('1', 'Trening #anna')]} onAddEvent={onAddEvent} onEditEvent={onEditEvent} />,
    )
    fireEvent.click(container.querySelector('.event')!)
    expect(onEditEvent).toHaveBeenCalledTimes(1)
    expect(onEditEvent.mock.calls[0][0].id).toBe('1')
    expect(onAddEvent).not.toHaveBeenCalled()
  })

  describe('expansion', () => {
    const timed = (id: string, title: string, from: number, to: number) => ({
      event: { id, title, allDay: false, start: new Date(2026, 9, 17, from), end: new Date(2026, 9, 17, to) },
      isContinuation: false,
    })
    const now = new Date(2026, 9, 17, 10, 30)
    const expansion = (expanded: boolean, onToggle: () => void = noop) => ({ expanded, now, hourForecasts: new Map<number, HourForecast>(), onToggle })
    const renderRow = (props: { expanded: boolean; isToday?: boolean; entries?: ReturnType<typeof entry>[]; onToggle?: () => void }) =>
      render(
        <DayRow
          day={day}
          isToday={props.isToday ?? false}
          columns={columns}
          members={members}
          columnOf={columnOf}
          entries={props.entries ?? []}
          expansion={expansion(props.expanded, props.onToggle)}
          onAddEvent={noop}
          onEditEvent={noop}
        />,
      )

    it('makes the date a button that reports its toggling and tells whether the day is expanded', () => {
      const onToggle = vi.fn()
      const collapsed = renderRow({ expanded: false, onToggle })
      const button = collapsed.container.querySelector('button.day-date')!
      expect(button.getAttribute('aria-expanded')).toBe('false')
      expect(button.textContent).toBe('17so')
      fireEvent.click(button)
      expect(onToggle).toHaveBeenCalledTimes(1)
      expect(collapsed.container.querySelector('.hour-body')).toBeNull()
      expect(collapsed.container.querySelector('.day-row')?.classList.contains('is-expanded')).toBe(false)
      const expanded = renderRow({ expanded: true })
      expect(expanded.container.querySelector('button.day-date')?.getAttribute('aria-expanded')).toBe('true')
    })

    it('keeps the date a plain element without expansion', () => {
      const { container } = render(<DayRow onAddEvent={noop} onEditEvent={noop} day={day} isToday={false} columns={columns} members={members} columnOf={columnOf} entries={[]} />)
      expect(container.querySelector('button')).toBeNull()
      expect(container.querySelector('.day-date')?.textContent).toBe('17so')
    })

    it('shows timed events on the hour grid and all-day events and continuations above it', () => {
      const entries = [
        entry('1', 'Cały dzień #anna'),
        { event: { ...event('2', 'Wielodniowe #anna'), allDay: false }, isContinuation: true },
        timed('3', 'Trening #anna', 9, 10),
      ]
      const { container } = renderRow({ expanded: true, entries })
      expect(container.querySelector('.day-row')?.classList.contains('is-expanded')).toBe(true)
      const head = [...container.querySelectorAll('.day-row > .day-cell .event-title')].map((node) => node.textContent)
      expect(head).toEqual(['Cały dzień', 'Wielodniowe'])
      const grid = [...container.querySelectorAll('.hour-body .event-title')].map((node) => node.textContent)
      expect(grid).toEqual(['Trening'])
    })

    it('shows the timed events in the compact row when collapsed', () => {
      const { container } = renderRow({ expanded: false, entries: [timed('3', 'Trening #anna', 9, 10)] })
      expect(container.querySelector('.day-row > .day-cell .event-title')?.textContent).toBe('Trening')
    })

    it('draws the now-line only when the row is today', () => {
      expect(renderRow({ expanded: true, isToday: true }).container.querySelector('.now-line')).toBeTruthy()
      expect(renderRow({ expanded: true }).container.querySelector('.now-line')).toBeNull()
    })
  })
})
