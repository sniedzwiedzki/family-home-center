import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { buildColumns } from './columns'
import type { HourForecast } from '../weather/types'
import type { DayEntry } from './days'
import { HourBody } from './HourBody'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]
const columns = buildColumns(members)
const noop = () => undefined
const day = new Date(2026, 9, 18)
const at = (hour: number, minute = 0) => new Date(2026, 9, 18, hour, minute)
const entry = (id: string, title: string, start: Date, end: Date): DayEntry => ({
  event: { id, title, allDay: false, start, end },
  isContinuation: false,
})

let hourForecasts = new Map<number, HourForecast>()
const renderBody = (entries: DayEntry[], now?: Date, handlers: { onAddEvent?: () => void; onEditEvent?: () => void } = {}) =>
  render(<HourBody day={day} now={now} columns={columns} members={members} entries={entries} hourForecasts={hourForecasts} onAddEvent={handlers.onAddEvent ?? noop} onEditEvent={handlers.onEditEvent ?? noop} />)

const labels = (container: HTMLElement) => [...container.querySelectorAll('.hour-label')].map((label) => label.textContent)
const eventIn = (container: HTMLElement, columnId: string) => container.querySelector<HTMLElement>(`.hour-track[data-column="${columnId}"] .event`)!

describe('HourBody', () => {
  it('labels the hours from 7 to 19 when nothing is earlier or later', () => {
    const { container } = renderBody([])
    expect(labels(container)).toEqual(Array.from({ length: 13 }, (_, i) => `${7 + i}:00`))
    expect(container.querySelector<HTMLElement>('.hour-body')?.style.getPropertyValue('--hours')).toBe('13.5')
  })

  it('adds hours for an event before 7 and one after 20', () => {
    const { container } = renderBody([entry('1', 'Rano', at(5, 30), at(6)), entry('2', 'Wieczór', at(21), at(21, 30))])
    expect(labels(container)[0]).toBe('5:00')
    expect(labels(container).at(-1)).toBe('21:00')
  })

  it('has one track per column', () => {
    const { container } = renderBody([])
    expect([...container.querySelectorAll('.hour-track')].map((track) => track.getAttribute('data-column'))).toEqual(['a', 'j', 'other'])
  })

  it('places an event at its hours in the column of its tag', () => {
    const { container } = renderBody([entry('1', 'Trening #anna', at(9, 30), at(11))])
    const item = eventIn(container, 'a')
    // 9:30 is 2.5 hours after 7:00, and the grid starts half an hour before 7:00.
    expect(item.style.top).toBe('calc(var(--hour-height) * 3)')
    expect(item.style.height).toBe('calc(var(--hour-height) * 1.5)')
    expect([item.style.left, item.style.width]).toEqual(['0%', '100%'])
    expect(container.querySelector('.hour-track[data-column="j"] .event')).toBeNull()
  })

  it('shows an untagged event in "Inne" and a multi-tag event in each column', () => {
    const { container } = renderBody([entry('1', 'Śmieci', at(8), at(9)), entry('2', 'Kino #anna #jan', at(8), at(9))])
    expect(container.querySelectorAll('.hour-track[data-column="other"] .event')).toHaveLength(1)
    expect(container.querySelectorAll('.hour-track[data-column="a"] .event')).toHaveLength(1)
    expect(container.querySelectorAll('.hour-track[data-column="j"] .event')).toHaveLength(1)
  })

  it('puts overlapping events of a column side by side', () => {
    const { container } = renderBody([entry('1', 'Jedno #anna', at(9), at(11)), entry('2', 'Drugie #anna', at(10), at(12))])
    const items = [...container.querySelectorAll<HTMLElement>('.hour-track[data-column="a"] .event')]
    expect(items.map((item) => [item.style.left, item.style.width])).toEqual([['0%', '50%'], ['50%', '50%']])
  })

  it('draws the now-line at the current time with its label', () => {
    const { container } = renderBody([], at(9, 30))
    const line = container.querySelector<HTMLElement>('.now-line')!
    expect(line.style.top).toBe('calc(var(--hour-height) * 3)')
    expect(line.textContent).toBe('09:30')
  })

  it('draws the now-line on the hour edges and not outside the shown hours', () => {
    expect(renderBody([], at(7)).container.querySelector('.now-line')).toBeTruthy()
    expect(renderBody([], at(20)).container.querySelector('.now-line')).toBeTruthy()
    expect(renderBody([], at(6, 59)).container.querySelector('.now-line')).toBeNull()
    expect(renderBody([], at(20, 1)).container.querySelector('.now-line')).toBeNull()
  })

  it('has no now-line for another day than today', () => {
    expect(renderBody([]).container.querySelector('.now-line')).toBeNull()
  })

  it('reports a click on a track with the day and column, and an event click as an edit', () => {
    const onAddEvent = vi.fn()
    const onEditEvent = vi.fn()
    const { container } = renderBody([entry('1', 'Trening #anna', at(9), at(10))], undefined, { onAddEvent, onEditEvent })
    const track = container.querySelector<HTMLElement>('.hour-track[data-column="j"]')!
    vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ top: 0, height: 1300 } as DOMRect)
    fireEvent.click(track, { clientY: 250 })
    expect(onAddEvent).toHaveBeenCalledWith(day, 'j', 9)
    fireEvent.click(eventIn(container, 'a'))
    expect(onEditEvent).toHaveBeenCalledTimes(1)
    expect(onAddEvent).toHaveBeenCalledTimes(1)
  })

  describe('clicking a track', () => {
    // A 1350 px tall track from y = 100: half an hour of margin, then 13 hours of 100 px, 7:00 to 20:00 (the margin counts as 7:00).
    const clickAt = (clientY: number) => {
      const onAddEvent = vi.fn()
      const { container } = renderBody([], undefined, { onAddEvent })
      const track = container.querySelector<HTMLElement>('.hour-track[data-column="a"]')!
      vi.spyOn(track, 'getBoundingClientRect').mockReturnValue({ top: 100, height: 1350 } as DOMRect)
      fireEvent.click(track, { clientY })
      return onAddEvent
    }

    it('reports the hour under the click', () => {
      expect(clickAt(130)).toHaveBeenCalledWith(day, 'a', 7)
      expect(clickAt(100 + 3 * 100 + 50)).toHaveBeenCalledWith(day, 'a', 10)
      expect(clickAt(1449)).toHaveBeenCalledWith(day, 'a', 19)
    })

    it('stays inside the shown hours', () => {
      expect(clickAt(50)).toHaveBeenCalledWith(day, 'a', 7)
      expect(clickAt(1500)).toHaveBeenCalledWith(day, 'a', 19)
    })
  })

  describe('forecast', () => {
    const forecastAt = (hour: number, code: number, temp: number): [number, HourForecast] => [at(hour).getTime(), { time: at(hour), code, temp }]
    const shown = (container: HTMLElement) => [...container.querySelectorAll('.hour-weather')].map((node) => [node.textContent, node.getAttribute('title')])

    it('shows icon and rounded temperature for every hour that has a forecast', () => {
      hourForecasts = new Map([forecastAt(8, 0, 12.6), forecastAt(9, 3, 11), forecastAt(10, 3, -1.4)])
      const { container } = renderBody([])
      expect(shown(container)).toEqual([['☀️13°', 'Bezchmurnie'], ['☁️11°', 'Pochmurno'], ['☁️-1°', 'Pochmurno']])
      expect(container.querySelector<HTMLElement>('.hour-weather')?.style.top).toBe('calc(var(--hour-height) * 1.5)')
    })

    it('puts the first hour and its forecast half an hour below the top, like every other hour', () => {
      hourForecasts = new Map([forecastAt(7, 0, 5), forecastAt(8, 0, 6)])
      const { container } = renderBody([])
      const tops = (selector: string) => [...container.querySelectorAll<HTMLElement>(selector)].slice(0, 2).map((node) => node.style.top)
      expect(tops('.hour-weather')).toEqual(['calc(var(--hour-height) * 0.5)', 'calc(var(--hour-height) * 1.5)'])
      expect(tops('.hour-label')).toEqual(['calc(var(--hour-height) * 0.5)', 'calc(var(--hour-height) * 1.5)'])
    })

    it('shows nothing for hours without a forecast', () => {
      hourForecasts = new Map()
      expect(shown(renderBody([]).container)).toEqual([])
    })
  })
})
