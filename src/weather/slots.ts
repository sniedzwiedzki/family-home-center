import type { HourForecast } from './types'

export const SLOT_COUNT = 12
export const SLOT_STEP_HOURS = 2

export const startOfHour = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours())

export interface ForecastSlot {
  time: Date
  forecast: HourForecast | null
}

/** Twelve 2-hour steps covering the next 24 hours, starting at the current hour. */
export function forecastSlots(hours: readonly HourForecast[], from: Date): ForecastSlot[] {
  const byTime = new Map(hours.map((hour) => [hour.time.getTime(), hour]))
  const start = startOfHour(from)
  return Array.from({ length: SLOT_COUNT }, (_, index) => {
    const time = new Date(start.getFullYear(), start.getMonth(), start.getDate(), start.getHours() + index * SLOT_STEP_HOURS)
    return { time, forecast: byTime.get(time.getTime()) ?? null }
  })
}
