import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Forecast } from '../weather/types'
import { BottomBar } from './BottomBar'

const hourly = (h: number, day = 17) => ({ time: new Date(2026, 9, day, h), code: 0, temp: h + 0.4, precipitationChance: null })
const forecast: Forecast = { days: [], hours: [hourly(14), hourly(16), hourly(20)] }

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(2026, 9, 17, 14, 30))
})
afterEach(() => vi.useRealTimers())

const slotTimes = (container: HTMLElement) => [...container.querySelectorAll('.slot-time')].map((node) => node.textContent)

describe('BottomBar', () => {
  it('says so when there is no forecast', () => {
    render(<BottomBar forecast={null} />)
    expect(screen.getByLabelText('Prognoza pogody na 24 godziny').textContent).toBe('Brak prognozy pogody')
  })

  it('shows 12 slots in 2h steps starting at the current hour', () => {
    const { container } = render(<BottomBar forecast={forecast} />)
    expect(slotTimes(container)).toEqual(['14:00', '16:00', '18:00', '20:00', '22:00', '00:00', '02:00', '04:00', '06:00', '08:00', '10:00', '12:00'])
  })

  it('shows icon and rounded temperature, and a dash for hours without data', () => {
    const { container } = render(<BottomBar forecast={forecast} />)
    const slots = [...container.querySelectorAll('.forecast-slot')]
    expect(slots[0].querySelector('.slot-temp')?.textContent).toBe('14°')
    expect(slots[0].querySelector('.slot-icon')?.getAttribute('title')).toBe('Bezchmurnie')
    expect(slots[1].querySelector('.slot-temp')?.textContent).toBe('16°')
    expect(slots[2].querySelector('.slot-missing')?.textContent).toBe('–')
    expect(slots[2].querySelector('.slot-temp')).toBeNull()
  })

  it('moves one hour on at the full hour, keeping the current time on the left', () => {
    const { container } = render(<BottomBar forecast={forecast} />)
    act(() => vi.advanceTimersByTime(30 * 60_000))
    expect(slotTimes(container)[0]).toBe('15:00')
    expect(slotTimes(container)[1]).toBe('17:00')
  })
})
