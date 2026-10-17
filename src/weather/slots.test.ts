import { describe, expect, it } from 'vitest'
import { forecastSlots, startOfHour } from './slots'
import type { HourForecast } from './types'

const hour = (day: number, h: number): HourForecast => ({ time: new Date(2026, 9, day, h), code: 0, temp: h, precipitationChance: null })

describe('startOfHour', () => {
  it('drops minutes and seconds', () => {
    expect(startOfHour(new Date(2026, 9, 17, 14, 45, 12))).toEqual(new Date(2026, 9, 17, 14))
  })
})

describe('forecastSlots', () => {
  it('returns 12 slots in 2h steps starting at the current hour', () => {
    const slots = forecastSlots([], new Date(2026, 9, 17, 14, 30))
    expect(slots).toHaveLength(12)
    expect(slots[0].time).toEqual(new Date(2026, 9, 17, 14))
    expect(slots[1].time).toEqual(new Date(2026, 9, 17, 16))
    expect(slots[11].time).toEqual(new Date(2026, 9, 18, 12))
  })

  it('attaches the matching hourly forecast and leaves gaps empty', () => {
    const slots = forecastSlots([hour(17, 14), hour(17, 18)], new Date(2026, 9, 17, 14))
    expect(slots[0].forecast?.temp).toBe(14)
    expect(slots[1].forecast).toBeNull()
    expect(slots[2].forecast?.temp).toBe(18)
  })
})
