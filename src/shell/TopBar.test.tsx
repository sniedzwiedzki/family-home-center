import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 9, 5, 0))
})
afterEach(() => vi.useRealTimers())

describe('TopBar', () => {
  it('shows the current time in the middle', () => {
    const { container } = render(<TopBar onOpenSettings={vi.fn()} onRefresh={vi.fn()} />)
    expect(screen.getByText('09:05')).toBeTruthy()
    expect(container.querySelector('header > :nth-child(2)')?.tagName).toBe('TIME')
    expect(container.querySelectorAll('header > *')).toHaveLength(3)
  })

  it('has the settings button on the right and reports clicks', () => {
    const onOpenSettings = vi.fn()
    const { container } = render(<TopBar onOpenSettings={onOpenSettings} onRefresh={vi.fn()} />)
    expect(container.querySelector('header > :last-child')?.getAttribute('aria-label')).toBe('Ustawienia')
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('has the refresh button on the left and reports clicks', () => {
    const onRefresh = vi.fn()
    const { container } = render(<TopBar onOpenSettings={vi.fn()} onRefresh={onRefresh} />)
    expect(container.querySelector('header > :first-child')?.getAttribute('aria-label')).toBe('Odśwież')
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('spins the refresh icon for the length of the animation after a click', () => {
    render(<TopBar onOpenSettings={vi.fn()} onRefresh={vi.fn()} />)
    const button = screen.getByRole('button', { name: 'Odśwież' })
    expect(button.classList.contains('is-spinning')).toBe(false)
    fireEvent.click(button)
    expect(button.classList.contains('is-spinning')).toBe(true)
    act(() => vi.advanceTimersByTime(799))
    expect(button.classList.contains('is-spinning')).toBe(true)
    act(() => vi.advanceTimersByTime(1))
    expect(button.classList.contains('is-spinning')).toBe(false)
  })

  it('stops its spin timer when the bar goes away', () => {
    const { unmount } = render(<TopBar onOpenSettings={vi.fn()} onRefresh={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
