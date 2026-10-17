import { z } from 'zod'
import type { DayForecast, Forecast, GeoLocation, HourForecast, WeatherPort } from './types'

const FORECAST_DAYS = 16

const numbers = z.array(z.number().nullable())

const responseSchema = z.object({
  daily: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    weather_code: numbers,
    temperature_2m_max: numbers,
    temperature_2m_min: numbers,
    precipitation_probability_max: numbers,
  }),
  hourly: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)),
    weather_code: numbers,
    temperature_2m: numbers,
    precipitation_probability: numbers,
  }),
})

const valueAt = (values: readonly (number | null)[], index: number): number | null => values[index] ?? null

// With `timezone=auto` Open-Meteo returns the location's local time; the device is assumed to be in the same zone.
function parseLocalTime(value: string): Date {
  const [date, time] = value.split('T')
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute)
}

function toDays(daily: z.infer<typeof responseSchema>['daily']): DayForecast[] {
  return daily.time.flatMap((day, index) => {
    const code = valueAt(daily.weather_code, index)
    const tempMax = valueAt(daily.temperature_2m_max, index)
    const tempMin = valueAt(daily.temperature_2m_min, index)
    if (code === null || tempMax === null || tempMin === null) return []
    return [{ day, code, tempMax, tempMin, precipitationChance: valueAt(daily.precipitation_probability_max, index) }]
  })
}

function toHours(hourly: z.infer<typeof responseSchema>['hourly']): HourForecast[] {
  return hourly.time.flatMap((time, index) => {
    const code = valueAt(hourly.weather_code, index)
    const temp = valueAt(hourly.temperature_2m, index)
    if (code === null || temp === null) return []
    return [{ time: parseLocalTime(time), code, temp, precipitationChance: valueAt(hourly.precipitation_probability, index) }]
  })
}

export function createOpenMeteoClient(fetchImpl: typeof fetch, baseUrl: string): WeatherPort {
  return {
    async getForecast({ latitude, longitude }: GeoLocation): Promise<Forecast> {
      const query = new URLSearchParams({
        latitude: String(latitude),
        longitude: String(longitude),
        timezone: 'auto',
        forecast_days: String(FORECAST_DAYS),
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
        hourly: 'weather_code,temperature_2m,precipitation_probability',
      })
      const response = await fetchImpl(`${baseUrl}?${query}`)
      if (!response.ok) throw new Error(`Open-Meteo responded with ${response.status}`)
      const { daily, hourly } = responseSchema.parse(await response.json())
      return { days: toDays(daily), hours: toHours(hourly) }
    },
  }
}
