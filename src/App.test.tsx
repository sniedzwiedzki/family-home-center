import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './settings/settings'

vi.mock('./calendar/CalendarView', () => ({
  CalendarView: ({ members }: { members: { name: string }[] }) => <main data-testid='calendar'>{members.map((m) => m.name).join(',')}</main>,
}))

beforeEach(() => window.localStorage.clear())

describe('App', () => {
  it('renders the top bar, the calendar and the bottom bar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeTruthy()
    expect(screen.getByTestId('calendar')).toBeTruthy()
    expect(screen.getByLabelText('Prognoza pogody na 24 godziny')).toBeTruthy()
  })

  it('passes the family members from the settings to the calendar', () => {
    const settings = { ...DEFAULT_SETTINGS, familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }] }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    render(<App />)
    expect(screen.getByTestId('calendar').textContent).toBe('Anna')
  })
})
