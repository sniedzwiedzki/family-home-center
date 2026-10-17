import { useState } from 'react'
import type { GeocodingPort, GeoLocation } from '../weather/types'
import { geoLocationSchema } from './settings'

interface WeatherLocationEditorProps {
  value: GeoLocation | null
  geocoder: GeocodingPort
  onChange: (location: GeoLocation | null) => void
}

const fieldsOf = (location: GeoLocation | null) => ({
  name: location?.name ?? '',
  latitude: location === null ? '' : String(location.latitude),
  longitude: location === null ? '' : String(location.longitude),
})

export function WeatherLocationEditor({ value, geocoder, onChange }: WeatherLocationEditorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoLocation[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [fields, setFields] = useState(() => fieldsOf(value))

  const choose = (location: GeoLocation | null) => {
    setFields(fieldsOf(location))
    setMessage(null)
    onChange(location)
  }

  const search = async () => {
    try {
      const found = await geocoder.search(query.trim())
      setResults(found)
      setMessage(found.length === 0 ? 'Nie znaleziono miejscowości' : null)
    } catch (error) {
      console.error('Location search failed', error)
      setMessage('Nie udało się wyszukać miejscowości')
    }
  }

  const apply = () => {
    const parsed = geoLocationSchema.safeParse({
      name: fields.name,
      latitude: fields.latitude === '' ? Number.NaN : Number(fields.latitude),
      longitude: fields.longitude === '' ? Number.NaN : Number(fields.longitude),
    })
    if (parsed.success) choose(parsed.data)
    else setMessage('Podaj nazwę oraz szerokość (od -90 do 90) i długość (od -180 do 180) geograficzną')
  }

  return (
    <section className="settings-section" aria-labelledby="weather-heading">
      <h3 id="weather-heading">Pogoda</h3>
      <p>{value === null ? 'Lokalizacja nie jest ustawiona' : `Lokalizacja: ${value.name} (${value.latitude}, ${value.longitude})`}</p>
      <div className="location-search">
        <label>
          Szukaj miejscowości
          <input value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button type="button" disabled={query.trim() === ''} onClick={search}>
          Szukaj
        </button>
      </div>
      <ul className="location-results">
        {results.map((result) => (
          <li key={`${result.latitude},${result.longitude}`}>
            <button type="button" onClick={() => choose(result)}>
              {result.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="location-fields">
        <label>
          Nazwa
          <input value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} />
        </label>
        <label>
          Szerokość
          <input inputMode="decimal" value={fields.latitude} onChange={(event) => setFields({ ...fields, latitude: event.target.value })} />
        </label>
        <label>
          Długość
          <input inputMode="decimal" value={fields.longitude} onChange={(event) => setFields({ ...fields, longitude: event.target.value })} />
        </label>
        <button type="button" onClick={apply}>
          Zastosuj współrzędne
        </button>
        <button type="button" disabled={value === null} onClick={() => choose(null)}>
          Usuń lokalizację
        </button>
      </div>
      {message !== null && (
        <p className="field-error" role="alert">
          {message}
        </p>
      )}
    </section>
  )
}
