import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { DayForecast, Forecast } from './weather/types'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './settings/settings'

const forecast: Forecast = { days: [{ day: '2026-10-17', code: 0, tempMax: 20, tempMin: 10, precipitationChance: null }], hours: [] }
const useForecast = vi.hoisted(() => vi.fn())

vi.mock('./weather/useForecast', () => ({ useForecast }))
vi.mock('./calendar/CalendarView', () => ({
  CalendarView: ({ members, forecasts }: { members: { name: string }[]; forecasts: ReadonlyMap<string, DayForecast> }) => (
    <main data-testid='calendar'>{`${members.map((m) => m.name).join(',')}|${[...forecasts.keys()].join(',')}`}</main>
  ),
}))
vi.mock('./shell/BottomBar', () => ({
  BottomBar: ({ forecast }: { forecast: Forecast | null }) => <footer data-testid='bottom'>{forecast === null ? 'none' : 'forecast'}</footer>,
}))

beforeEach(() => {
  window.localStorage.clear()
  useForecast.mockReset().mockReturnValue(null)
})

describe('App', () => {
  it('renders the top bar, the calendar and the bottom bar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeTruthy()
    expect(screen.getByTestId('calendar')).toBeTruthy()
    expect(screen.getByTestId('bottom').textContent).toBe('none')
  })

  it('passes the family members from the settings to the calendar', () => {
    const settings = { ...DEFAULT_SETTINGS, familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }] }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    render(<App />)
    expect(screen.getByTestId('calendar').textContent).toBe('Anna|')
  })

  it('asks for the forecast of the configured location and passes it down', () => {
    const location = { name: 'Warszawa', latitude: 52.23, longitude: 21.01 }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, weather: { location } }))
    useForecast.mockReturnValue(forecast)
    render(<App />)
    expect(useForecast).toHaveBeenCalledWith(expect.anything(), location)
    expect(screen.getByTestId('calendar').textContent).toBe('|2026-10-17')
    expect(screen.getByTestId('bottom').textContent).toBe('forecast')
  })
})
