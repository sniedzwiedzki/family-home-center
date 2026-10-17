import { describe, expect, it } from 'vitest'
import { formatClock, formatMonthLabel, formatWeekday } from './format'

describe('format', () => {
  it('formats the clock with a 24h Polish clock', () => {
    expect(formatClock(new Date(2026, 9, 17, 9, 5))).toBe('09:05')
    expect(formatClock(new Date(2026, 9, 17, 18, 30))).toBe('18:30')
  })

  it('abbreviates weekdays to two Polish letters', () => {
    const week = Array.from({ length: 7 }, (_, i) => formatWeekday(new Date(2026, 9, 12 + i)))
    expect(week).toEqual(['po', 'wt', 'śr', 'cz', 'pt', 'so', 'nd'])
  })

  it('names the month in the nominative', () => {
    expect(formatMonthLabel(new Date(2026, 9, 17))).toBe('październik')
    expect(formatMonthLabel(new Date(2026, 1, 3))).toBe('luty')
  })

  it('adds the year to January', () => {
    expect(formatMonthLabel(new Date(2027, 0, 5))).toBe('styczeń 2027')
  })
})
