import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 9, 5, 0))
})
afterEach(() => vi.useRealTimers())

describe('TopBar', () => {
  it('shows the current time in the middle', () => {
    const { container } = render(<TopBar onOpenSettings={vi.fn()} />)
    expect(screen.getByText('09:05')).toBeTruthy()
    expect(container.querySelector('header > :nth-child(2)')?.tagName).toBe('TIME')
    expect(container.querySelectorAll('header > *')).toHaveLength(3)
  })

  it('has the settings button on the right and reports clicks', () => {
    const onOpenSettings = vi.fn()
    const { container } = render(<TopBar onOpenSettings={onOpenSettings} />)
    expect(container.querySelector('header > :last-child')?.tagName).toBe('BUTTON')
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })
})
