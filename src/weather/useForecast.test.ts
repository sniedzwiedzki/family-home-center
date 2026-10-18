import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Forecast, GeoLocation, WeatherPort } from './types'
import { useForecast } from './useForecast'

const warsaw: GeoLocation = { name: 'Warszawa', latitude: 52.23, longitude: 21.01 }
const krakow: GeoLocation = { name: 'Kraków', latitude: 50.06, longitude: 19.94 }
const forecast = (temp: number): Forecast => ({ days: [{ day: '2026-10-17', code: 0, tempMax: temp, tempMin: 0 }], hours: [] })
const MINUTE = 60_000

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('useForecast', () => {
  it('does nothing without a location', () => {
    const port: WeatherPort = { getForecast: vi.fn() }
    const { result } = renderHook(() => useForecast(port, null))
    expect(result.current).toBeNull()
    expect(port.getForecast).not.toHaveBeenCalled()
  })

  it('loads the forecast and refreshes it every 30 minutes', async () => {
    const getForecast = vi.fn<WeatherPort['getForecast']>().mockResolvedValueOnce(forecast(10)).mockResolvedValueOnce(forecast(20))
    const port: WeatherPort = { getForecast }
    const { result } = renderHook(() => useForecast(port, warsaw))
    await act(async () => {})
    expect(result.current?.days[0].tempMax).toBe(10)
    expect(getForecast).toHaveBeenCalledWith(warsaw)
    await act(async () => vi.advanceTimersByTime(30 * MINUTE))
    expect(result.current?.days[0].tempMax).toBe(20)
  })

  it('keeps the last forecast on failure and retries after a minute', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const getForecast = vi
      .fn<WeatherPort['getForecast']>()
      .mockResolvedValueOnce(forecast(10))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(forecast(30))
    const port: WeatherPort = { getForecast }
    const { result } = renderHook(() => useForecast(port, warsaw))
    await act(async () => {})
    await act(async () => vi.advanceTimersByTime(30 * MINUTE))
    expect(log).toHaveBeenCalledTimes(1)
    expect(result.current?.days[0].tempMax).toBe(10)
    await act(async () => vi.advanceTimersByTime(MINUTE))
    expect(result.current?.days[0].tempMax).toBe(30)
  })

  it('shows nothing for a new location until its forecast arrives, and nothing once the location is removed', async () => {
    const getForecast = vi.fn(async (location: GeoLocation) => forecast(location.latitude))
    const port: WeatherPort = { getForecast }
    const { result, rerender } = renderHook(({ location }) => useForecast(port, location), {
      initialProps: { location: warsaw as GeoLocation | null },
    })
    await act(async () => {})
    expect(result.current?.days[0].tempMax).toBe(52.23)
    rerender({ location: krakow })
    expect(result.current).toBeNull()
    await act(async () => {})
    expect(result.current?.days[0].tempMax).toBe(50.06)
    expect(getForecast).toHaveBeenCalledTimes(2)
    rerender({ location: null })
    expect(result.current).toBeNull()
  })

  it('fetches again right away when the refresh signal changes, keeping the shown forecast meanwhile', async () => {
    const getForecast = vi.fn<WeatherPort['getForecast']>().mockResolvedValueOnce(forecast(10)).mockResolvedValueOnce(forecast(25))
    const port: WeatherPort = { getForecast }
    const { result, rerender } = renderHook(({ signal }) => useForecast(port, warsaw, signal), { initialProps: { signal: 0 } })
    await act(async () => {})
    expect(result.current?.days[0].tempMax).toBe(10)
    rerender({ signal: 1 })
    expect(result.current?.days[0].tempMax).toBe(10)
    await act(async () => {})
    expect(result.current?.days[0].tempMax).toBe(25)
    expect(getForecast).toHaveBeenCalledTimes(2)
  })

  it('stops refreshing after unmount', async () => {
    const getForecast = vi.fn(async () => forecast(1))
    const port: WeatherPort = { getForecast }
    const { unmount } = renderHook(() => useForecast(port, warsaw))
    await act(async () => {})
    unmount()
    await act(async () => vi.advanceTimersByTime(60 * MINUTE))
    expect(getForecast).toHaveBeenCalledTimes(1)
  })

  it('ignores a result that arrives after unmount', async () => {
    let resolve: (value: Forecast) => void = () => undefined
    const getForecast = vi.fn(() => new Promise<Forecast>((r) => (resolve = r)))
    const port: WeatherPort = { getForecast }
    const { unmount } = renderHook(() => useForecast(port, warsaw))
    unmount()
    resolve(forecast(1))
    await act(async () => vi.advanceTimersByTime(60 * MINUTE))
    expect(getForecast).toHaveBeenCalledTimes(1)
  })

  it('ignores a failure that arrives after unmount', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    let reject: (reason: Error) => void = () => undefined
    const getForecast = vi.fn(() => new Promise<Forecast>((_, r) => (reject = r)))
    const port: WeatherPort = { getForecast }
    const { unmount } = renderHook(() => useForecast(port, warsaw))
    unmount()
    reject(new Error('late'))
    await act(async () => vi.advanceTimersByTime(60 * MINUTE))
    expect(log).not.toHaveBeenCalled()
    expect(getForecast).toHaveBeenCalledTimes(1)
  })
})
