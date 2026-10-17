import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EventItem } from './EventItem'
import type { CalendarEvent } from './types'

const base: CalendarEvent = { id: 'e', title: 'Dentysta #anna', allDay: false, start: new Date(2026, 9, 17, 9, 5), end: new Date(2026, 9, 17, 10, 30) }

const text = (container: HTMLElement) => [container.querySelector('.event-time')?.textContent, container.querySelector('.event-title')?.textContent]

describe('EventItem', () => {
  it('shows the time range and the title without #tags', () => {
    const { container } = render(<EventItem entry={{ event: base, isContinuation: false }} color={null} />)
    expect(text(container)).toEqual(['09:05–10:30', 'Dentysta'])
  })

  it('labels all-day events', () => {
    const { container } = render(<EventItem entry={{ event: { ...base, allDay: true }, isContinuation: false }} color={null} />)
    expect(text(container)[0]).toBe('cały dzień')
  })

  it('labels continuation days', () => {
    const { container } = render(<EventItem entry={{ event: { ...base, allDay: true }, isContinuation: true }} color={null} />)
    expect(text(container)[0]).toBe('ciąg dalszy')
  })

  it('uses the column color for the accent when there is one', () => {
    const colored = render(<EventItem entry={{ event: base, isContinuation: false }} color="#ff0000" />)
    expect(colored.container.querySelector<HTMLElement>('.event')?.style.borderLeftColor).toBe('rgb(255, 0, 0)')
    const plain = render(<EventItem entry={{ event: base, isContinuation: false }} color={null} />)
    expect(plain.container.querySelector<HTMLElement>('.event')?.style.borderLeftColor).toBe('')
  })
})
