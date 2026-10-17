import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './settings/settings'

beforeEach(() => window.localStorage.clear())

describe('App', () => {
  it('renders the top bar, the calendar column headers and the bottom bar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeTruthy()
    expect(screen.getByText('Inne')).toBeTruthy()
    expect(screen.getByLabelText('Prognoza pogody na 24 godziny')).toBeTruthy()
  })

  it('shows a column for every family member from the settings', () => {
    const settings = { ...DEFAULT_SETTINGS, familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }] }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    render(<App />)
    expect(screen.getByText('Anna')).toBeTruthy()
  })
})
