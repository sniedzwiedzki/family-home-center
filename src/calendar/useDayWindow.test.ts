import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { dayKey } from './days'
import { useDayWindow } from './useDayWindow'

const anchor = new Date(2026, 9, 17)

describe('useDayWindow', () => {
  it('starts with 30 days on each side of the anchor', () => {
    const { result } = renderHook(() => useDayWindow(anchor))
    expect(result.current.days).toHaveLength(61)
    expect(dayKey(result.current.days[30])).toBe('2026-10-17')
    expect(result.current.before).toBe(30)
    expect(dayKey(result.current.range.from)).toBe('2026-09-17')
    expect(dayKey(result.current.range.to)).toBe('2026-11-17')
  })

  it('extends into the past', () => {
    const { result } = renderHook(() => useDayWindow(anchor))
    act(() => result.current.extendBefore())
    expect(result.current.days).toHaveLength(91)
    expect(result.current.before).toBe(60)
    expect(dayKey(result.current.days[0])).toBe('2026-08-18')
  })

  it('extends into the future', () => {
    const { result } = renderHook(() => useDayWindow(anchor))
    act(() => result.current.extendAfter())
    expect(result.current.days).toHaveLength(91)
    expect(dayKey(result.current.days[90])).toBe('2026-12-16')
  })
})
