import { describe, expect, it } from 'vitest'
import { formatClock, formatDayLabel } from './format'

describe('format', () => {
  it('formats the clock with a 24h Polish clock', () => {
    expect(formatClock(new Date(2026, 9, 17, 9, 5))).toBe('09:05')
    expect(formatClock(new Date(2026, 9, 17, 18, 30))).toBe('18:30')
  })

  it('formats a day label in Polish', () => {
    expect(formatDayLabel(new Date(2026, 9, 17))).toBe('sobota, 17 października')
  })
})
