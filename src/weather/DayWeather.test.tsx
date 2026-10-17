import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DayWeather } from './DayWeather'
import type { DayForecast } from './types'

const forecast: DayForecast = { day: '2026-10-17', code: 61, tempMax: 14.4, tempMin: 7.6 }

describe('DayWeather', () => {
  it('shows rounded max/min temperatures compactly, with the icon and a label as tooltip', () => {
    const { container } = render(<DayWeather forecast={forecast} />)
    expect(container.textContent).toContain('14°/8°')
    expect(container.querySelector('.day-weather')?.getAttribute('title')).toBe('Deszcz')
  })

  it('shows nothing about the chance of rain', () => {
    const { container } = render(<DayWeather forecast={forecast} />)
    expect(container.textContent).not.toContain('%')
  })
})
