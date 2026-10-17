import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentHour } from './useCurrentHour'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 14, 59, 0))
})
afterEach(() => vi.useRealTimers())

describe('useCurrentHour', () => {
  it('returns the start of the current hour', () => {
    const { result } = renderHook(() => useCurrentHour())
    expect(result.current).toEqual(new Date(2026, 9, 17, 14))
  })

  it('moves to the next hour at the full hour and keeps moving', () => {
    const { result } = renderHook(() => useCurrentHour())
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toEqual(new Date(2026, 9, 17, 15))
    act(() => vi.advanceTimersByTime(60 * 60_000))
    expect(result.current).toEqual(new Date(2026, 9, 17, 16))
  })

  it('catches up when the timer fires late', () => {
    const { result } = renderHook(() => useCurrentHour())
    act(() => vi.setSystemTime(new Date(2026, 9, 17, 20, 10)))
    act(() => vi.advanceTimersByTime(60_000))
    expect(result.current).toEqual(new Date(2026, 9, 17, 20))
  })

  it('clears its timer on unmount', () => {
    const { unmount } = renderHook(() => useCurrentHour())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
