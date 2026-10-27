import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FakeResizeObserver } from './fakeResizeObserver'
import { useElementWidths } from './useElementWidths'

const observer = () => FakeResizeObserver.instances[0]

// jsdom has no ResizeObserver.
beforeEach(() => {
  FakeResizeObserver.instances = []
  vi.stubGlobal('ResizeObserver', FakeResizeObserver)
})

describe('useElementWidths', () => {
  it('starts empty and creates no observer before an element is measured', () => {
    const { result } = renderHook(() => useElementWidths())
    expect(result.current[0].size).toBe(0)
    result.current[1]('a')(null)
    expect(FakeResizeObserver.instances).toHaveLength(0)
  })

  it('reports the measured width of each element by its key', () => {
    const { result } = renderHook(() => useElementWidths())
    const first = document.createElement('button')
    const second = document.createElement('button')
    act(() => {
      result.current[1]('a')(first)
      result.current[1]('b')(second)
    })
    expect(FakeResizeObserver.instances).toHaveLength(1)
    expect([...observer().observed]).toEqual([first, second])
    act(() => observer().resize(new Map([[first, 120], [second, 80]])))
    expect([...result.current[0]]).toEqual([['a', 120], ['b', 80]])
    act(() => observer().resize(new Map([[first, 140]])))
    expect([...result.current[0]]).toEqual([['a', 140], ['b', 80]])
  })

  it('gives the same ref callback for a key on every render, so nothing is observed again', () => {
    const { result, rerender } = renderHook(() => useElementWidths())
    const ref = result.current[1]('a')
    rerender()
    expect(result.current[1]('a')).toBe(ref)
    expect(result.current[1]('b')).not.toBe(ref)
  })

  it('stops watching an element when it is replaced or removed', () => {
    const { result } = renderHook(() => useElementWidths())
    const first = document.createElement('button')
    const second = document.createElement('button')
    const ref = result.current[1]('a')
    act(() => ref(first))
    act(() => ref(second))
    expect([...observer().observed]).toEqual([second])
    act(() => ref(null))
    expect(observer().observed.size).toBe(0)
  })

  it('disconnects when unmounted', () => {
    const { result, unmount } = renderHook(() => useElementWidths())
    act(() => result.current[1]('a')(document.createElement('button')))
    unmount()
    expect(observer().observed.size).toBe(0)
  })

  it('unmounts cleanly when nothing was measured', () => {
    const { unmount } = renderHook(() => useElementWidths())
    expect(() => unmount()).not.toThrow()
  })
})
