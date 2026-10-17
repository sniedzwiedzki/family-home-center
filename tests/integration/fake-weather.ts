import { createServer, type Server } from 'node:http'

const FORECAST_DAYS = 16
const HOURS_PER_DAY = 24
const pad = (value: number) => String(value).padStart(2, '0')

function buildForecast(today: Date) {
  const days = Array.from({ length: FORECAST_DAYS }, (_, index) => new Date(today.getFullYear(), today.getMonth(), today.getDate() + index))
  const hours = days.flatMap((day) =>
    Array.from({ length: HOURS_PER_DAY }, (_, hour) => `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}T${pad(hour)}:00`),
  )
  return {
    daily: {
      time: days.map((day) => `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`),
      weather_code: days.map(() => 0),
      temperature_2m_max: days.map(() => 20),
      temperature_2m_min: days.map(() => 10),
      precipitation_probability_max: days.map(() => 30),
    },
    hourly: {
      time: hours,
      weather_code: hours.map(() => 0),
      temperature_2m: hours.map(() => 15),
      precipitation_probability: hours.map(() => 0),
    },
  }
}

const GEOCODING = {
  results: [{ name: 'Gdańsk', latitude: 54.35, longitude: 18.65, admin1: 'Pomorskie', country: 'Polska' }],
}

/** A stand-in for Open-Meteo: a clear-sky 16-day forecast starting today, and a geocoding search that finds Gdańsk. */
export function startFakeWeatherServer(port: number): Promise<Server> {
  const server = createServer((request, response) => {
    response.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': '*' })
    const isGeocoding = request.url?.startsWith('/v1/search') ?? false
    response.end(JSON.stringify(isGeocoding ? GEOCODING : buildForecast(new Date())))
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}
