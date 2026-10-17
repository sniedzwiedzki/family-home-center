import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { dayKey } from './days'
import { useToday } from './useToday'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 23, 59, 0))
})
afterEach(() => vi.useRealTimers())

describe('useToday', () => {
  it('returns the start of today', () => {
    const { result } = renderHook(() => useToday())
    expect(dayKey(result.current)).toBe('2026-10-17')
  })

  it('rolls over to the next day at midnight and keeps rolling', () => {
    const { result } = renderHook(() => useToday())
    act(() => vi.advanceTimersByTime(60_000))
    expect(dayKey(result.current)).toBe('2026-10-18')
    act(() => vi.advanceTimersByTime(24 * 60 * 60 * 1000))
    expect(dayKey(result.current)).toBe('2026-10-19')
  })

  it('catches up when the timer fires late', () => {
    const { result } = renderHook(() => useToday())
    act(() => vi.setSystemTime(new Date(2026, 9, 20, 10)))
    act(() => vi.advanceTimersByTime(60_000))
    expect(dayKey(result.current)).toBe('2026-10-20')
  })

  it('clears its timer on unmount', () => {
    const { unmount } = renderHook(() => useToday())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
