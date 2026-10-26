import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EventItem, EventSpacer } from './EventItem'
import { SpecialTagContext } from './specialTag'
import type { CalendarEvent } from './types'

const noop = () => undefined
const base: CalendarEvent = { id: 'e', title: 'Dentysta #anna', allDay: false, start: new Date(2026, 9, 17, 9, 5), end: new Date(2026, 9, 17, 10, 30) }

const text = (container: HTMLElement) => [container.querySelector('.event-time')?.textContent, container.querySelector('.event-title')?.textContent]

describe('EventItem', () => {
  it('shows the time range and the title without #tags', () => {
    const { container } = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(text(container)).toEqual(['09:05–10:30', 'Dentysta'])
  })

  it('shows only the title of an all-day event, without a time line', () => {
    const { container } = render(<EventItem onEdit={noop} entry={{ event: { ...base, allDay: true }, isContinuation: false }} color={null} />)
    expect(container.querySelector('.event-time')).toBeNull()
    expect(text(container)).toEqual([undefined, 'Dentysta'])
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

  it('is marked as shared when it is drawn across the columns of several people', () => {
    const shared = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} sharedColors={['#ff0000', '#00ff00']} />)
    expect(shared.container.querySelector('.event')?.classList.contains('is-shared')).toBe(true)
    expect(shared.container.querySelector<HTMLElement>('.event')?.style.getPropertyValue('--span')).toBe('2')
    const plain = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(plain.container.querySelector('.event')?.classList.contains('is-shared')).toBe(false)
  })

  it('has an invisible spacer that matches the lines of the chip and is hidden from assistive technology', () => {
    const timed = render(<EventSpacer entry={{ event: base, isContinuation: false }} />)
    expect(timed.container.querySelector('.event-spacer')?.getAttribute('aria-hidden')).toBe('true')
    expect(timed.container.querySelectorAll('.spacer-time, .spacer-title')).toHaveLength(2)
    const allDay = render(<EventSpacer entry={{ event: { ...base, allDay: true }, isContinuation: false }} />)
    expect(allDay.container.querySelectorAll('.spacer-time')).toHaveLength(0)
    expect(allDay.container.querySelectorAll('.spacer-title')).toHaveLength(1)
  })

  it('puts a gold star before the title of a special event only', () => {
    const special = { ...base, title: 'Urodziny #star' }
    const marked = render(<EventItem onEdit={noop} entry={{ event: special, isContinuation: false }} color={null} />)
    const star = marked.container.querySelector('.event-star')!
    expect([star.textContent, star.getAttribute('role'), star.getAttribute('aria-label')]).toEqual(['★', 'img', 'Wydarzenie specjalne'])
    expect(marked.container.querySelector('.event-title')?.textContent).toBe('★Urodziny')
    const plain = render(<EventItem onEdit={noop} entry={{ event: base, isContinuation: false }} color={null} />)
    expect(plain.container.querySelector('.event-star')).toBeNull()
  })

  it('follows the special tag chosen in the settings', () => {
    const entry = { event: { ...base, title: 'Urodziny #gwiazda' }, isContinuation: false }
    const custom = render(
      <SpecialTagContext.Provider value="gwiazda">
        <EventItem onEdit={noop} entry={entry} color={null} />
      </SpecialTagContext.Provider>,
    )
    expect(custom.container.querySelector('.event-star')).not.toBeNull()
    const byDefault = render(<EventItem onEdit={noop} entry={entry} color={null} />)
    expect(byDefault.container.querySelector('.event-star')).toBeNull()
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
