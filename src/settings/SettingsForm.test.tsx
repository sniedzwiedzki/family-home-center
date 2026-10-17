import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GeocodingPort } from '../weather/types'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import { SettingsForm } from './SettingsForm'

const geocoder: GeocodingPort = { search: vi.fn(async () => []) }
const settings: Settings = {
  ...DEFAULT_SETTINGS,
  familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }],
  weather: { location: { name: 'Warszawa', latitude: 52.23, longitude: 21.01 } },
  pin: '1234',
}
const save = () => screen.getByRole('button', { name: 'Zapisz' }) as HTMLButtonElement
const enter = (pin: string) => {
  for (const digit of pin) fireEvent.click(screen.getByRole('button', { name: digit }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

describe('SettingsForm', () => {
  it('starts from the saved settings', () => {
    render(<SettingsForm settings={settings} geocoder={geocoder} onChange={vi.fn()} onClose={vi.fn()} />)
    expect((screen.getByLabelText('Imię') as HTMLInputElement).value).toBe('Anna')
    expect(screen.getByText(/Lokalizacja: Warszawa/)).toBeTruthy()
    expect(save().disabled).toBe(false)
  })

  it('saves normalized members and the location, then closes', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} onChange={onChange} onClose={onClose} />)
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: ' ANNA2 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Usuń lokalizację' }))
    fireEvent.click(save())
    expect(onChange).toHaveBeenCalledWith({
      ...settings,
      familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna2', color: '#ff0000' }],
      weather: { location: null },
    })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cannot be saved while a member is invalid', () => {
    render(<SettingsForm settings={settings} geocoder={geocoder} onChange={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Imię'), { target: { value: '' } })
    expect(save().disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Podaj imię (do 30 znaków)')
  })

  it('closes without saving on cancel', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('changes the PIN immediately and keeps the unsaved edits', () => {
    const onChange = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} onChange={onChange} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Imię'), { target: { value: 'Ania' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień PIN' }))
    enter('9999')
    enter('9999')
    expect(onChange).toHaveBeenCalledWith({ ...settings, pin: '9999' })
    expect((screen.getByLabelText('Imię') as HTMLInputElement).value).toBe('Ania')
  })
})
