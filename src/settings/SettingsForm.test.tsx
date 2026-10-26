import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DiscoveredCalendar } from '../google/calendarList'
import type { GeocodingPort } from '../weather/types'
import { DEFAULT_SETTINGS, type Settings } from './settings'
import { SettingsForm } from './SettingsForm'

const geocoder: GeocodingPort = { search: vi.fn(async () => []) }
const calendarsFound: DiscoveredCalendar[] = [{ id: 'me@x', name: 'Ja', canWrite: true, selected: true, primary: true }]
const checkGoogle = vi.fn(async () => calendarsFound)
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
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
    expect((screen.getByLabelText('Imię') as HTMLInputElement).value).toBe('Anna')
    expect(screen.getByText(/Lokalizacja: Warszawa/)).toBeTruthy()
    expect(save().disabled).toBe(false)
  })

  it('saves normalized members and the location, then closes', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={onClose} />)
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
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Imię'), { target: { value: '' } })
    expect(save().disabled).toBe(true)
    expect(screen.getByRole('alert').textContent).toBe('Podaj imię (do 30 znaków)')
  })

  it('closes without saving on cancel', () => {
    const onChange = vi.fn()
    const onClose = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('changes the PIN immediately and keeps the unsaved edits', () => {
    const onChange = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Imię'), { target: { value: 'Ania' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zmień PIN' }))
    enter('9999')
    enter('9999')
    expect(onChange).toHaveBeenCalledWith({ ...settings, pin: '9999' })
    expect((screen.getByLabelText('Imię') as HTMLInputElement).value).toBe('Ania')
  })

  it('saves the Gemini key and model, and clears them when the key is emptied', () => {
    const onChange = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Klucz API Gemini'), { target: { value: ' fake-key ' } })
    fireEvent.click(save())
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ gemini: { apiKey: 'fake-key', model: 'gemini-3.8-flash' } }))
    fireEvent.change(screen.getByLabelText('Klucz API Gemini'), { target: { value: '' } })
    fireEvent.click(save())
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ gemini: null }))
  })

  it('saves the typed font sizes as numbers', () => {
    const onChange = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Numer dnia miesiąca (px)'), { target: { value: '50' } })
    fireEvent.click(save())
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ fontSizes: { ...settings.fontSizes, dayNumber: 50 } }))
  })

  it('cannot be saved while a font size is not a valid number', () => {
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tytuł wydarzenia (px)'), { target: { value: '' } })
    expect(save().disabled).toBe(true)
  })

  it('saves the special tag, normalized', () => {
    const onChange = vi.fn()
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
    expect((screen.getByLabelText('Tag wydarzenia specjalnego (bez #)') as HTMLInputElement).value).toBe('star')
    fireEvent.change(screen.getByLabelText('Tag wydarzenia specjalnego (bez #)'), { target: { value: ' Gwiazda ' } })
    fireEvent.click(save())
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ specialTag: 'gwiazda' }))
  })

  it('cannot be saved while the special tag is invalid or is the tag of a person', () => {
    render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tag wydarzenia specjalnego (bez #)'), { target: { value: 'two words' } })
    expect(save().disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Tag wydarzenia specjalnego (bez #)'), { target: { value: 'anna' } })
    expect(save().disabled).toBe(true)
    expect(screen.getByText('Tag nie może być taki sam jak tag osoby')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Tag'), { target: { value: 'ania' } })
    expect(save().disabled).toBe(false)
  })

  describe('Google section', () => {
    const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
    const fillGoogle = () => {
      type('Identyfikator klienta', ' fake-client ')
      type('Sekret klienta', 'fake-secret')
      type('Token odświeżania', 'fake-refresh')
    }

    it('is part of the form and starts disconnected', () => {
      render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
      expect(screen.getByRole('heading', { name: 'Google Calendar' })).toBeTruthy()
      expect((screen.getByLabelText('Identyfikator klienta') as HTMLInputElement).value).toBe('')
    })

    it('saves the credentials and the chosen calendars after the connection was checked', async () => {
      const onChange = vi.fn()
      render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
      fillGoogle()
      fireEvent.click(screen.getByRole('button', { name: 'Sprawdź połączenie' }))
      await screen.findByText(/Połączono/)
      fireEvent.click(save())
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          google: { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh' },
          calendars: { readIds: ['me@x'], writeId: 'me@x', known: [{ id: 'me@x', name: 'Ja', canWrite: true }] },
        }),
      )
    })

    it('cannot be saved with only some of the credentials', () => {
      render(<SettingsForm settings={settings} geocoder={geocoder} checkGoogle={checkGoogle} onChange={vi.fn()} onClose={vi.fn()} />)
      type('Identyfikator klienta', 'fake-client')
      expect(save().disabled).toBe(true)
      type('Sekret klienta', 'fake-secret')
      type('Token odświeżania', 'fake-refresh')
      expect(save().disabled).toBe(false)
    })

    it('forgets Google when it is disconnected and saved', () => {
      const connected: Settings = {
        ...settings,
        google: { clientId: 'a', clientSecret: 'b', refreshToken: 'c' },
        calendars: { readIds: ['me@x'], writeId: 'me@x', known: [{ id: 'me@x', name: 'Ja', canWrite: true }] },
      }
      const onChange = vi.fn()
      render(<SettingsForm settings={connected} geocoder={geocoder} checkGoogle={checkGoogle} onChange={onChange} onClose={vi.fn()} />)
      expect((screen.getByLabelText('Identyfikator klienta') as HTMLInputElement).value).toBe('a')
      expect(screen.getByLabelText('Pokaż: Ja')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Odłącz Google' }))
      fireEvent.click(save())
      expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ google: null, calendars: { readIds: [], writeId: null, known: [] } }))
    })
  })
})
