import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildColumns } from './columns'
import { ColumnHeaders } from './ColumnHeaders'

const members = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

const headersOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.column-header')]
const namesOf = (container: HTMLElement) => headersOf(container).map((header) => header.querySelector('.column-name')?.textContent)

describe('ColumnHeaders', () => {
  it('shows only "Inne" without members', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} />)
    expect(namesOf(container)).toEqual(['Inne'])
  })

  it('shows member columns in order followed by the fixed "Inne" column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} />)
    expect(namesOf(container)).toEqual(['Anna', 'Jan', 'Inne'])
    expect(headersOf(container).map((header) => header.dataset.column)).toEqual(['member', 'member', 'other'])
  })

  it('shows an initial avatar per member and an ellipsis for "Inne"', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([...members, { id: 'z', name: 'żaneta', tag: 'z', color: '#0000ff' }])} />)
    const avatars = [...container.querySelectorAll('.avatar')].map((avatar) => avatar.textContent)
    expect(avatars).toEqual(['A', 'J', 'Ż', '…'])
    expect(container.querySelector('.avatar')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('passes the member color through a CSS variable, and none for "Inne"', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} />)
    const headers = headersOf(container)
    expect(headers[0].style.getPropertyValue('--person-color')).toBe('#ff0000')
    expect(headers[2].style.getPropertyValue('--person-color')).toBe('')
  })

  it('leaves room for the day label column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} />)
    expect(container.querySelector('.column-headers')?.children).toHaveLength(2)
  })
})
