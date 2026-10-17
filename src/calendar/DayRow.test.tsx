import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns } from './columns'
import { DayRow } from './DayRow'
import type { DayForecast } from '../weather/types'
import type { CalendarEvent } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]
const columns = buildColumns(members)
const day = new Date(2026, 9, 17)
const event = (id: string, title: string): CalendarEvent => ({ id, title, allDay: true, start: day, end: new Date(2026, 9, 18) })
const entry = (id: string, title: string) => ({ event: event(id, title), isContinuation: false })

const cellTitles = (container: HTMLElement, columnId: string) =>
  [...container.querySelectorAll(`.day-cell[data-column="${columnId}"] .event-title`)].map((node) => node.textContent)

describe('DayRow', () => {
  it('shows the Polish day label and the day key', () => {
    const { container } = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={[]} />)
    expect(container.querySelector('.day-label')?.textContent).toBe('sobota, 17 października')
    expect(container.querySelector('.day-row')?.getAttribute('data-day')).toBe('2026-10-17')
  })

  it('marks today', () => {
    const today = render(<DayRow day={day} isToday columns={columns} members={members} entries={[]} />)
    expect(today.container.querySelector('.day-row')?.classList.contains('is-today')).toBe(true)
    const other = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={[]} />)
    expect(other.container.querySelector('.day-row')?.classList.contains('is-today')).toBe(false)
  })

  it('renders one cell per column', () => {
    const { container } = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={[]} />)
    expect([...container.querySelectorAll('.day-cell')].map((cell) => cell.getAttribute('data-column'))).toEqual(['a', 'j', 'other'])
  })

  it('places events in the columns of their tags, multi-tag events in each, the rest in "Inne"', () => {
    const entries = [entry('1', 'Trening #anna'), entry('2', 'Kino #anna #jan'), entry('3', 'Śmieci')]
    const { container } = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={entries} />)
    expect(cellTitles(container, 'a')).toEqual(['Trening', 'Kino'])
    expect(cellTitles(container, 'j')).toEqual(['Kino'])
    expect(cellTitles(container, 'other')).toEqual(['Śmieci'])
  })

  it('shows the forecast under the day label when there is one', () => {
    const forecast: DayForecast = { day: '2026-10-17', code: 0, tempMax: 20, tempMin: 10, precipitationChance: null }
    const withForecast = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={[]} forecast={forecast} />)
    expect(withForecast.container.querySelector('.day-label .day-weather')).toBeTruthy()
    const without = render(<DayRow day={day} isToday={false} columns={columns} members={members} entries={[]} />)
    expect(without.container.querySelector('.day-weather')).toBeNull()
  })
})
