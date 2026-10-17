import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { ColumnHeaders } from './ColumnHeaders'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' },
]

describe('ColumnHeaders', () => {
  it('shows only "Inne" without members', () => {
    render(<ColumnHeaders members={[]} />)
    expect(screen.getAllByText(/./).map((node) => node.textContent)).toEqual(['Inne'])
  })

  it('shows member columns in order followed by the fixed "Inne" column', () => {
    const { container } = render(<ColumnHeaders members={members} />)
    const headers = [...container.querySelectorAll<HTMLElement>('.column-header')]
    expect(headers.map((header) => header.textContent)).toEqual(['Anna', 'Jan', 'Inne'])
    expect(headers.map((header) => header.dataset.column)).toEqual(['member', 'member', 'other'])
  })

  it('colors member columns with the member color only', () => {
    const { container } = render(<ColumnHeaders members={members} />)
    const headers = [...container.querySelectorAll<HTMLElement>('.column-header')]
    expect(headers[0].style.borderBottomColor).toBe('rgb(255, 0, 0)')
    expect(headers[2].style.borderBottomColor).toBe('')
  })
})
