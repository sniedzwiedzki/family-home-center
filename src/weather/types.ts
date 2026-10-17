export interface GeoLocation {
  name: string
  latitude: number
  longitude: number
}

export interface DayForecast {
  /** Local date, `YYYY-MM-DD`. */
  day: string
  code: number
  tempMax: number
  tempMin: number
  precipitationChance: number | null
}

export interface HourForecast {
  time: Date
  code: number
  temp: number
  precipitationChance: number | null
}

export interface Forecast {
  days: DayForecast[]
  hours: HourForecast[]
}

export interface WeatherPort {
  getForecast(location: GeoLocation): Promise<Forecast>
}

export interface GeocodingPort {
  search(query: string): Promise<GeoLocation[]>
}
