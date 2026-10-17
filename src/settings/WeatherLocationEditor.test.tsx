import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GeocodingPort, GeoLocation } from '../weather/types'
import { WeatherLocationEditor } from './WeatherLocationEditor'

const warsaw: GeoLocation = { name: 'Warszawa', latitude: 52.23, longitude: 21.01 }
const gdansk: GeoLocation = { name: 'Gdańsk, Pomorskie, Polska', latitude: 54.35, longitude: 18.65 }
const geocoderReturning = (results: GeoLocation[]): GeocodingPort => ({ search: vi.fn(async () => results) })
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement

afterEach(() => vi.restoreAllMocks())

describe('WeatherLocationEditor', () => {
  it('says when no location is set and disables removing and searching', () => {
    render(<WeatherLocationEditor value={null} geocoder={geocoderReturning([])} onChange={vi.fn()} />)
    expect(screen.getByText('Lokalizacja nie jest ustawiona')).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Usuń lokalizację' }) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Szukaj' }) as HTMLButtonElement).disabled).toBe(true)
    expect([input('Nazwa').value, input('Szerokość').value, input('Długość').value]).toEqual(['', '', ''])
  })

  it('shows the current location in the fields', () => {
    render(<WeatherLocationEditor value={warsaw} geocoder={geocoderReturning([])} onChange={vi.fn()} />)
    expect(screen.getByText('Lokalizacja: Warszawa (52.23, 21.01)')).toBeTruthy()
    expect([input('Nazwa').value, input('Szerokość').value, input('Długość').value]).toEqual(['Warszawa', '52.23', '21.01'])
  })

  it('searches and lets the user pick a result', async () => {
    const geocoder = geocoderReturning([gdansk])
    const onChange = vi.fn()
    render(<WeatherLocationEditor value={null} geocoder={geocoder} onChange={onChange} />)
    fireEvent.change(input('Szukaj miejscowości'), { target: { value: ' Gdańsk ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    fireEvent.click(await screen.findByRole('button', { name: gdansk.name }))
    expect(geocoder.search).toHaveBeenCalledWith('Gdańsk')
    expect(onChange).toHaveBeenCalledWith(gdansk)
    expect(input('Szerokość').value).toBe('54.35')
  })

  it('says when nothing was found', async () => {
    render(<WeatherLocationEditor value={null} geocoder={geocoderReturning([])} onChange={vi.fn()} />)
    fireEvent.change(input('Szukaj miejscowości'), { target: { value: 'zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nie znaleziono miejscowości')
  })

  it('says when the search fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const geocoder: GeocodingPort = { search: vi.fn(async () => Promise.reject(new Error('offline'))) }
    render(<WeatherLocationEditor value={null} geocoder={geocoder} onChange={vi.fn()} />)
    fireEvent.change(input('Szukaj miejscowości'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się wyszukać miejscowości')
    expect(log).toHaveBeenCalledTimes(1)
  })

  it('clears a previous message after a successful search', async () => {
    const geocoder: GeocodingPort = { search: vi.fn<GeocodingPort['search']>().mockResolvedValueOnce([]).mockResolvedValueOnce([gdansk]) }
    render(<WeatherLocationEditor value={null} geocoder={geocoder} onChange={vi.fn()} />)
    fireEvent.change(input('Szukaj miejscowości'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    await screen.findByRole('alert')
    fireEvent.click(screen.getByRole('button', { name: 'Szukaj' }))
    await screen.findByRole('button', { name: gdansk.name })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('applies manually entered coordinates', () => {
    const onChange = vi.fn()
    render(<WeatherLocationEditor value={null} geocoder={geocoderReturning([])} onChange={onChange} />)
    fireEvent.change(input('Nazwa'), { target: { value: ' Dom ' } })
    fireEvent.change(input('Szerokość'), { target: { value: '51.1' } })
    fireEvent.change(input('Długość'), { target: { value: '17.03' } })
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj współrzędne' }))
    expect(onChange).toHaveBeenCalledWith({ name: 'Dom', latitude: 51.1, longitude: 17.03 })
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each([
    ['empty coordinates', '', ''],
    ['text instead of numbers', 'abc', 'def'],
    ['out of range', '91', '10'],
  ])('rejects %s', (_label, latitude, longitude) => {
    const onChange = vi.fn()
    render(<WeatherLocationEditor value={null} geocoder={geocoderReturning([])} onChange={onChange} />)
    fireEvent.change(input('Nazwa'), { target: { value: 'Dom' } })
    fireEvent.change(input('Szerokość'), { target: { value: latitude } })
    fireEvent.change(input('Długość'), { target: { value: longitude } })
    fireEvent.click(screen.getByRole('button', { name: 'Zastosuj współrzędne' }))
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toContain('Podaj nazwę')
  })

  it('removes the location and clears the fields', () => {
    const onChange = vi.fn()
    render(<WeatherLocationEditor value={warsaw} geocoder={geocoderReturning([])} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Usuń lokalizację' }))
    expect(onChange).toHaveBeenCalledWith(null)
    expect(input('Nazwa').value).toBe('')
  })
})
