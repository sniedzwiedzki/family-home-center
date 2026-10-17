import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY, type Settings } from './settings'
import { useSettings } from './useSettings'

const next: Settings = { ...DEFAULT_SETTINGS, pin: '4321' }

beforeEach(() => window.localStorage.clear())
afterEach(() => vi.restoreAllMocks())

describe('useSettings', () => {
  it('starts with defaults', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('loads stored settings', () => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next))
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(next)
  })

  it('updates state and persists', () => {
    const { result } = renderHook(() => useSettings())
    act(() => result.current.updateSettings(next))
    expect(result.current.settings).toEqual(next)
    expect(window.localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(JSON.stringify(next))
  })

  it('keeps the new settings in memory when persisting fails', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useSettings())
    act(() => result.current.updateSettings(next))
    expect(result.current.settings).toEqual(next)
    expect(log).toHaveBeenCalledTimes(1)
  })
})
