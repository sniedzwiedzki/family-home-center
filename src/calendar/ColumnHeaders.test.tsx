import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { buildColumns } from './columns'
import { ColumnHeaders } from './ColumnHeaders'

const members = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

const headersOf = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>('.column-header')]

describe('ColumnHeaders', () => {
  it('shows only "Inne" without members', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} />)
    expect(headersOf(container).map((header) => header.textContent)).toEqual(['Inne'])
  })

  it('shows member columns in order followed by the fixed "Inne" column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} />)
    const headers = headersOf(container)
    expect(headers.map((header) => header.textContent)).toEqual(['Anna', 'Jan', 'Inne'])
    expect(headers.map((header) => header.dataset.column)).toEqual(['member', 'member', 'other'])
  })

  it('colors member columns with the member color only', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns(members)} />)
    const headers = headersOf(container)
    expect(headers[0].style.borderBottomColor).toBe('rgb(255, 0, 0)')
    expect(headers[2].style.borderBottomColor).toBe('')
  })

  it('leaves room for the day label column', () => {
    const { container } = render(<ColumnHeaders columns={buildColumns([])} />)
    expect(container.querySelector('.column-headers')?.children).toHaveLength(2)
  })
})
