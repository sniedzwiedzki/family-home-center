import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent, CalendarPort, DateRange } from './types'
import { useCalendarEvents } from './useCalendarEvents'

const event = (id: string): CalendarEvent => ({ id, title: id, allDay: true, start: new Date(2026, 9, 17), end: new Date(2026, 9, 18) })
const portOf = (listEvents: CalendarPort['listEvents']): CalendarPort => ({
  listEvents,
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
})
const range = (fromDay: number, toDay: number): DateRange => ({ from: new Date(2026, 9, fromDay), to: new Date(2026, 9, toDay) })

afterEach(() => vi.restoreAllMocks())

describe('useCalendarEvents', () => {
  it('loads the whole range first', async () => {
    const port = portOf(vi.fn(async () => [event('a')]))
    const { result } = renderHook(() => useCalendarEvents(port, range(10, 20)))
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['a']))
    expect(port.listEvents).toHaveBeenCalledWith(range(10, 20))
    expect(result.current.hasError).toBe(false)
  })

  it('fetches only the newly exposed days when the range grows on both sides', async () => {
    const listEvents = vi.fn(async ({ from }: DateRange) => [event(`from-${from.getDate()}`)])
    const port = portOf(listEvents)
    const { result, rerender } = renderHook(({ r }) => useCalendarEvents(port, r), { initialProps: { r: range(10, 20) } })
    await waitFor(() => expect(result.current.events).toHaveLength(1))
    rerender({ r: range(5, 25) })
    await waitFor(() => expect(result.current.events).toHaveLength(3))
    expect(listEvents).toHaveBeenCalledWith(range(5, 10))
    expect(listEvents).toHaveBeenCalledWith(range(20, 25))
    expect(listEvents).toHaveBeenCalledTimes(3)
  })

  it('fetches only the end when the range grows forward, only the start when it grows backward', async () => {
    const listEvents = vi.fn(async () => [])
    const port = portOf(listEvents)
    const { rerender } = renderHook(({ r }) => useCalendarEvents(port, r), { initialProps: { r: range(10, 20) } })
    await waitFor(() => expect(listEvents).toHaveBeenCalledTimes(1))
    rerender({ r: range(10, 25) })
    await waitFor(() => expect(listEvents).toHaveBeenLastCalledWith(range(20, 25)))
    rerender({ r: range(5, 25) })
    await waitFor(() => expect(listEvents).toHaveBeenLastCalledWith(range(5, 10)))
    expect(listEvents).toHaveBeenCalledTimes(3)
  })

  it('does not refetch when only the port changes', async () => {
    const first = portOf(vi.fn(async () => [event('a')]))
    const second = portOf(vi.fn(async () => []))
    const { result, rerender } = renderHook(({ p }) => useCalendarEvents(p, range(10, 20)), { initialProps: { p: first } })
    await waitFor(() => expect(result.current.events).toHaveLength(1))
    rerender({ p: second })
    await waitFor(() => expect(second.listEvents).not.toHaveBeenCalled())
    expect(result.current.events).toHaveLength(1)
  })

  it('merges events by id', async () => {
    const port = portOf(vi.fn(async () => [event('same')]))
    const { result, rerender } = renderHook(({ r }) => useCalendarEvents(port, r), { initialProps: { r: range(10, 20) } })
    await waitFor(() => expect(result.current.events).toHaveLength(1))
    rerender({ r: range(10, 25) })
    await waitFor(() => expect(port.listEvents).toHaveBeenCalledTimes(2))
    expect(result.current.events).toHaveLength(1)
  })

  it('reports a failure and recovers on the next successful load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const listEvents = vi.fn<CalendarPort['listEvents']>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue([event('a')])
    const port = portOf(listEvents)
    const { result, rerender } = renderHook(({ r }) => useCalendarEvents(port, r), { initialProps: { r: range(10, 20) } })
    await waitFor(() => expect(result.current.hasError).toBe(true))
    rerender({ r: range(10, 21) })
    await waitFor(() => expect(result.current.hasError).toBe(false))
    expect(result.current.events).toHaveLength(1)
  })

  it('ignores results that arrive after unmount', async () => {
    let resolve: (events: CalendarEvent[]) => void = () => undefined
    const port = portOf(() => new Promise((r) => (resolve = r)))
    const { unmount } = renderHook(() => useCalendarEvents(port, range(10, 20)))
    unmount()
    resolve([event('late')])
    await Promise.resolve()
  })

  it('ignores failures that arrive after unmount', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let reject: (reason: Error) => void = () => undefined
    const port = portOf(() => new Promise((_, r) => (reject = r)))
    const { unmount } = renderHook(() => useCalendarEvents(port, range(10, 20)))
    unmount()
    reject(new Error('late'))
    await new Promise((r) => setTimeout(r, 0))
    expect(log).not.toHaveBeenCalled()
  })

  it('reloads the whole range on request, replacing what was loaded', async () => {
    const listEvents = vi.fn<CalendarPort['listEvents']>().mockResolvedValueOnce([event('old')]).mockResolvedValueOnce([event('new')])
    const port = portOf(listEvents)
    const { result } = renderHook(() => useCalendarEvents(port, range(10, 20)))
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['old']))
    act(() => result.current.reload())
    await waitFor(() => expect(result.current.events.map((e) => e.id)).toEqual(['new']))
    expect(listEvents).toHaveBeenLastCalledWith(range(10, 20))
  })
})
