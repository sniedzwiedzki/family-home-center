import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useClock } from './useClock'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 18, 14, 3, 20))
})
afterEach(() => vi.useRealTimers())

describe('useClock', () => {
  it('returns the time rounded down to the minute', () => {
    const { result } = renderHook(() => useClock())
    expect(result.current).toEqual(new Date(2026, 9, 18, 14, 3))
  })

  it('moves on every minute and not in between', () => {
    const { result } = renderHook(() => useClock())
    act(() => vi.advanceTimersByTime(30_000))
    expect(result.current).toEqual(new Date(2026, 9, 18, 14, 3))
    act(() => vi.advanceTimersByTime(30_000))
    expect(result.current).toEqual(new Date(2026, 9, 18, 14, 4))
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toEqual(new Date(2026, 9, 18, 14, 5))
  })

  it('catches up when the timer fires late', () => {
    const { result } = renderHook(() => useClock())
    act(() => vi.setSystemTime(new Date(2026, 9, 18, 16, 42)))
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toEqual(new Date(2026, 9, 18, 16, 42))
  })

  it('clears its timer on unmount', () => {
    const { unmount } = renderHook(() => useClock())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
