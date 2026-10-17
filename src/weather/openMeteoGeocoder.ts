import { z } from 'zod'
import type { GeocodingPort, GeoLocation } from './types'

const RESULT_COUNT = 5

const responseSchema = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        admin1: z.string().optional(),
        country: z.string().optional(),
      }),
    )
    .optional(),
})

export function createOpenMeteoGeocoder(fetchImpl: typeof fetch, baseUrl: string): GeocodingPort {
  return {
    async search(query: string): Promise<GeoLocation[]> {
      const params = new URLSearchParams({ name: query, count: String(RESULT_COUNT), language: 'pl', format: 'json' })
      const response = await fetchImpl(`${baseUrl}?${params}`)
      if (!response.ok) throw new Error(`Open-Meteo geocoding responded with ${response.status}`)
      const { results = [] } = responseSchema.parse(await response.json())
      return results.map(({ name, admin1, country, latitude, longitude }) => ({
        name: [name, admin1, country].filter((part) => part !== undefined).join(', '),
        latitude,
        longitude,
      }))
    },
  }
}
