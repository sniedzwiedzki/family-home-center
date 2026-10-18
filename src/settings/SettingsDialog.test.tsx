import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GeocodingPort } from '../weather/types'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import { SettingsDialog } from './SettingsDialog'

const geocoder: GeocodingPort = { search: vi.fn(async () => []) }
const checkGoogle = vi.fn(async () => [])
const withPin: Settings = { ...DEFAULT_SETTINGS, pin: '1234' }
const enter = (pin: string) => {
  for (const digit of pin) fireEvent.click(screen.getByRole('button', { name: digit }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}
const show = (settings: Settings, onChange = vi.fn(), onClose = vi.fn()) => {
  render(<SettingsDialog settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={onClose} />)
  return { onChange, onClose }
}

describe('SettingsDialog', () => {
  it('is a labelled modal dialog with a close button', () => {
    const { onClose } = show(withPin)
    expect(screen.getByRole('dialog', { name: 'Ustawienia' }).getAttribute('aria-modal')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('asks for the PIN first and keeps the settings hidden after a wrong one', () => {
    show(withPin)
    expect(screen.getByRole('heading', { name: 'Wpisz PIN' })).toBeTruthy()
    enter('0000')
    expect(screen.getByRole('alert').textContent).toBe('Nieprawidłowy PIN')
    expect(screen.queryByRole('button', { name: 'Zapisz' })).toBeNull()
  })

  it('shows the settings after the right PIN', () => {
    show(withPin)
    enter('1234')
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeTruthy()
  })

  it('creates the PIN on first use, stores it and unlocks', () => {
    const { onChange } = show(DEFAULT_SETTINGS)
    expect(screen.getByRole('heading', { name: 'Ustaw PIN do ustawień' })).toBeTruthy()
    enter('4321')
    enter('4321')
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_SETTINGS, pin: '4321' })
    expect(screen.getByRole('button', { name: 'Zapisz' })).toBeTruthy()
  })
})
