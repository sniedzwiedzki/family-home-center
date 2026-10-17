import { describe, expect, it, vi } from 'vitest'
import { createOpenMeteoClient } from './openMeteoClient'

const BASE_URL = 'https://weather.example/v1/forecast'
const location = { name: 'Warszawa', latitude: 52.23, longitude: 21.01 }

const body = (overrides: object = {}) => ({
  daily: {
    time: ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'],
    weather_code: [3, 61, null, 0],
    temperature_2m_max: [14.4, 11, 10, null],
    temperature_2m_min: [8.2, 6, 5, 4],
    precipitation_probability_max: [10, null, 5, 0],
  },
  hourly: {
    time: ['2026-10-17T14:00', '2026-10-17T15:00', '2026-10-17T16:00', '2026-10-17T17:00'],
    weather_code: [3, null, 61],
    temperature_2m: [13.5, 13, null, 12],
    precipitation_probability: [0, 10, 20],
  },
  ...overrides,
})

const fetchReturning = (payload: unknown, ok = true, status = 200) =>
  vi.fn(async (_input: RequestInfo | URL) => ({ ok, status, json: async () => payload }) as Response)

describe('createOpenMeteoClient', () => {
  it('requests the forecast for the location in the local time zone', async () => {
    const fetchImpl = fetchReturning(body())
    await createOpenMeteoClient(fetchImpl, BASE_URL).getForecast(location)
    const url = new URL(String(fetchImpl.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe(BASE_URL)
    expect(url.searchParams.get('latitude')).toBe('52.23')
    expect(url.searchParams.get('longitude')).toBe('21.01')
    expect(url.searchParams.get('timezone')).toBe('auto')
    expect(url.searchParams.get('forecast_days')).toBe('16')
    expect(url.searchParams.get('daily')).toContain('temperature_2m_max')
    expect(url.searchParams.get('hourly')).toContain('temperature_2m')
  })

  it('maps daily forecasts and skips days with missing essentials', async () => {
    const { days } = await createOpenMeteoClient(fetchReturning(body()), BASE_URL).getForecast(location)
    expect(days).toEqual([
      { day: '2026-10-17', code: 3, tempMax: 14.4, tempMin: 8.2, precipitationChance: 10 },
      { day: '2026-10-18', code: 61, tempMax: 11, tempMin: 6, precipitationChance: null },
    ])
  })

  it('maps hourly forecasts to local times and skips hours with missing essentials', async () => {
    const { hours } = await createOpenMeteoClient(fetchReturning(body()), BASE_URL).getForecast(location)
    expect(hours).toEqual([{ time: new Date(2026, 9, 17, 14), code: 3, temp: 13.5, precipitationChance: 0 }])
  })

  it('treats values missing from short arrays as unknown', async () => {
    const { hours } = await createOpenMeteoClient(
      fetchReturning(body({ hourly: { time: ['2026-10-17T14:00'], weather_code: [0], temperature_2m: [10], precipitation_probability: [] } })),
      BASE_URL,
    ).getForecast(location)
    expect(hours[0].precipitationChance).toBeNull()
  })

  it('fails on an HTTP error', async () => {
    await expect(createOpenMeteoClient(fetchReturning({}, false, 503), BASE_URL).getForecast(location)).rejects.toThrow('503')
  })

  it('fails on a malformed response', async () => {
    await expect(createOpenMeteoClient(fetchReturning({ daily: {} }), BASE_URL).getForecast(location)).rejects.toThrow()
  })
})
