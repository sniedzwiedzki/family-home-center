import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ColumnHeaders, HOME_LABEL } from './ColumnHeaders'

const noop = () => undefined
const members = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

const legendOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.legend .column-header')]

describe('ColumnHeaders', () => {
  it('shows the family members in order as a legend, without "Inne"', () => {
    const { container } = render(<ColumnHeaders members={members} onHome={noop} />)
    expect(legendOf(container).map((item) => item.querySelector('.column-name')?.textContent)).toEqual(['Anna', 'Jan'])
  })

  it('shows an empty legend without members', () => {
    const { container } = render(<ColumnHeaders members={[]} onHome={noop} />)
    expect(legendOf(container)).toEqual([])
  })

  it('shows an initial avatar per member, hidden from assistive technology', () => {
    const { container } = render(<ColumnHeaders members={[...members, { id: 'z', name: 'żaneta', tag: 'z', color: '#0000ff' }]} onHome={noop} />)
    expect([...container.querySelectorAll('.avatar')].map((avatar) => avatar.textContent)).toEqual(['A', 'J', 'Ż'])
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('passes each member colour through a CSS variable', () => {
    const { container } = render(<ColumnHeaders members={members} onHome={noop} />)
    expect(legendOf(container).map((item) => item.style.getPropertyValue('--person-color'))).toEqual(['#ff0000', '#00ff00'])
  })

  it('has a home button on the left that reports a click', () => {
    const onHome = vi.fn()
    const { container } = render(<ColumnHeaders members={members} onHome={onHome} />)
    expect(container.querySelector('.column-headers')?.firstElementChild?.contains(screen.getByRole('button', { name: HOME_LABEL }))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: HOME_LABEL }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
