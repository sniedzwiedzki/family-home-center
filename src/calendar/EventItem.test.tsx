import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventItem } from './EventItem'
import type { CalendarEvent } from './types'

const noop = () => undefined
const base: CalendarEvent = { id: 'e', title: 'Dentysta #anna', allDay: false, start: new Date(2026, 9, 17, 9, 5), end: new Date(2026, 9, 17, 10, 30) }

const text = (container: HTMLElement) => [container.querySelector('.event-time')?.textContent, container.querySelector('.event-title')?.textContent]

describe('EventItem', () => {
  it('shows the time range and the title without #tags', () => {
    const { container } = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(text(container)).toEqual(['09:05–10:30', 'Dentysta'])
  })

  it('labels all-day events', () => {
    const { container } = render(<EventItem onEdit={noop} entry={{ event: { ...base, allDay: true }, isContinuation: false }} color={null} />)
    expect(text(container)[0]).toBe('cały dzień')
  })

  it('labels continuation days', () => {
    const { container } = render(<EventItem onEdit={noop} entry={{ event: { ...base, allDay: true }, isContinuation: true }} color={null} />)
    expect(text(container)[0]).toBe('ciąg dalszy')
  })

  it('uses the column color for the accent when there is one', () => {
    const colored = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color="#ff0000" />)
    expect(colored.container.querySelector<HTMLElement>('.event')?.style.getPropertyValue('--event-color')).toBe('#ff0000')
    const plain = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(plain.container.querySelector<HTMLElement>('.event')?.style.getPropertyValue('--event-color')).toBe('')
  })

  it('is a button that reports the event to edit, without the click reaching the cell behind it', () => {
    const onEdit = vi.fn()
    const outerClick = vi.fn()
    render(
      <div onClick={outerClick}>
        <EventItem entry={{ event: base, isContinuation: false }} color={null} onEdit={onEdit} />
      </div>,
    )
    fireEvent.click(screen.getByRole('button'))
    expect(onEdit).toHaveBeenCalledWith(base)
    expect(outerClick).not.toHaveBeenCalled()
  })

  it('is positioned on the hour grid when given a placement', () => {
    const placement = { top: '10px', height: '20px', left: '50%', width: '50%' }
    const placed = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color="#ff0000" placement={placement} />)
    const button = placed.container.querySelector<HTMLElement>('.event')!
    expect(button.classList.contains('is-timed')).toBe(true)
    expect([button.style.top, button.style.height, button.style.left, button.style.width]).toEqual(['10px', '20px', '50%', '50%'])
    expect(button.style.getPropertyValue('--event-color')).toBe('#ff0000')
    const plain = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(plain.container.querySelector('.event')?.classList.contains('is-timed')).toBe(false)
  })
})
