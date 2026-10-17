import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DayWeather } from './DayWeather'
import type { DayForecast } from './types'

const forecast: DayForecast = { day: '2026-10-17', code: 61, tempMax: 14.4, tempMin: 7.6, precipitationChance: 40 }

describe('DayWeather', () => {
  it('shows rounded max/min temperatures, the icon and the rain chance', () => {
    const { container } = render(<DayWeather forecast={forecast} />)
    expect(container.textContent).toContain('14° / 8°')
    expect(container.textContent).toContain('40%')
    expect(container.querySelector('.day-weather')?.getAttribute('title')).toBe('Deszcz')
  })

  it.each([[null], [0]])('hides the rain chance when it is %s', (chance) => {
    const { container } = render(<DayWeather forecast={{ ...forecast, precipitationChance: chance }} />)
    expect(container.querySelector('.rain-chance')).toBeNull()
  })
})
