export interface WeatherDescription {
  label: string
  icon: string
}

const UNKNOWN: WeatherDescription = { label: 'Brak danych', icon: '❔' }

// WMO weather interpretation codes, as returned by Open-Meteo.
const DESCRIPTIONS: ReadonlyArray<{ codes: readonly number[]; description: WeatherDescription }> = [
  { codes: [0], description: { label: 'Bezchmurnie', icon: '☀️' } },
  { codes: [1, 2], description: { label: 'Częściowe zachmurzenie', icon: '⛅' } },
  { codes: [3], description: { label: 'Pochmurno', icon: '☁️' } },
  { codes: [45, 48], description: { label: 'Mgła', icon: '🌫️' } },
  { codes: [51, 53, 55, 56, 57], description: { label: 'Mżawka', icon: '🌦️' } },
  { codes: [61, 63, 65, 66, 67], description: { label: 'Deszcz', icon: '🌧️' } },
  { codes: [71, 73, 75, 77], description: { label: 'Śnieg', icon: '🌨️' } },
  { codes: [80, 81, 82], description: { label: 'Przelotny deszcz', icon: '🌦️' } },
  { codes: [85, 86], description: { label: 'Przelotny śnieg', icon: '🌨️' } },
  { codes: [95, 96, 99], description: { label: 'Burza', icon: '⛈️' } },
]

export const describeWeather = (code: number): WeatherDescription =>
  DESCRIPTIONS.find((entry) => entry.codes.includes(code))?.description ?? UNKNOWN
