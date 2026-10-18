import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { buildColumns } from './columns'
import { ColumnHeaders, HOME_LABEL } from './ColumnHeaders'

const noop = () => undefined
const members = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

const headersOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.column-header')]
const namesOf = (container: HTMLElement) => headersOf(container).map((header) => header.querySelector('.column-name')?.textContent)

describe('ColumnHeaders', () => {
  it('shows only "Inne" without members', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} onHome={noop} />)
    expect(namesOf(container)).toEqual(['Inne'])
  })

  it('shows member columns in order followed by the fixed "Inne" column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} onHome={noop} />)
    expect(namesOf(container)).toEqual(['Anna', 'Jan', 'Inne'])
    expect(headersOf(container).map((header) => header.dataset.column)).toEqual(['member', 'member', 'other'])
  })

  it('shows an initial avatar per member and an ellipsis for "Inne"', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([...members, { id: 'z', name: 'żaneta', tag: 'z', color: '#0000ff' }])} onHome={noop} />)
    const avatars = [...container.querySelectorAll('.avatar')].map((avatar) => avatar.textContent)
    expect(avatars).toEqual(['A', 'J', 'Ż', '…'])
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('passes the member color through a CSS variable, and none for "Inne"', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} onHome={noop} />)
    const headers = headersOf(container)
    expect(headers[0].style.getPropertyValue('--person-color')).toBe('#ff0000')
    expect(headers[2].style.getPropertyValue('--person-color')).toBe('')
  })

  it('leaves room for the day label column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} onHome={noop} />)
    expect(container.querySelector('.column-headers')?.children).toHaveLength(2)
  })

  it('has a home button in the day label column that reports a click', () => {
    const onHome = vi.fn()
    const { container } = render(<ColumnHeaders columns={buildColumns([])} onHome={onHome} />)
    expect(container.querySelector('.home-slot')?.contains(screen.getByRole('button', { name: HOME_LABEL }))).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: HOME_LABEL }))
    expect(onHome).toHaveBeenCalledTimes(1)
  })
})
