import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MonthBlock } from './MonthBlock'

describe('MonthBlock', () => {
  it('labels the block with the month name and renders its days next to it', () => {
    const { container } = render(
      <MonthBlock monthKey="2026-10" firstDay={new Date(2026, 9, 1)}>
        <p>dni</p>
      </MonthBlock>,
    )
    expect(container.querySelector('.month-block')?.getAttribute('data-month')).toBe('2026-10')
    expect(container.querySelector('h2.month-label')?.textContent).toBe('październik')
    expect(container.querySelector('.month-days p')?.textContent).toBe('dni')
  })

  it('adds the year for January', () => {
    const { container } = render(
      <MonthBlock monthKey="2027-01" firstDay={new Date(2027, 0, 1)}>
        <p />
      </MonthBlock>,
    )
    expect(container.querySelector('.month-label')?.textContent).toBe('styczeń 2027')
  })
})
