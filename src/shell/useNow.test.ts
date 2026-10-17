import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useNow } from './useNow'

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 12, 0, 0))
})
afterEach(() => vi.useRealTimers())

describe('useNow', () => {
  it('returns the current time and ticks every second', () => {
    const { result } = renderHook(() => useNow())
    expect(result.current.getTime()).toBe(new Date(2026, 9, 17, 12, 0, 0).getTime())
    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.getTime()).toBe(new Date(2026, 9, 17, 12, 0, 1).getTime())
  })

  it('stops ticking after unmount', () => {
    const { unmount } = renderHook(() => useNow())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
