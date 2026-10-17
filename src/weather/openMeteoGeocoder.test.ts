import { describe, expect, it, vi } from 'vitest'
import { createOpenMeteoGeocoder } from './openMeteoGeocoder'

const BASE_URL = 'https://geo.example/v1/search'

const fetchReturning = (payload: unknown, ok = true, status = 200) =>
  vi.fn(async (_input: RequestInfo | URL) => ({ ok, status, json: async () => payload }) as Response)

describe('createOpenMeteoGeocoder', () => {
  it('searches by name in Polish with a small result count', async () => {
    const fetchImpl = fetchReturning({ results: [] })
    await createOpenMeteoGeocoder(fetchImpl, BASE_URL).search('Kraków')
    const url = new URL(String(fetchImpl.mock.calls[0][0]))
    expect(url.origin + url.pathname).toBe(BASE_URL)
    expect(url.searchParams.get('name')).toBe('Kraków')
    expect(url.searchParams.get('language')).toBe('pl')
    expect(url.searchParams.get('count')).toBe('5')
  })

  it('maps results to named locations, skipping missing region and country', async () => {
    const payload = {
      results: [
        { name: 'Warszawa', latitude: 52.23, longitude: 21.01, admin1: 'Mazowieckie', country: 'Polska' },
        { name: 'Atlantis', latitude: 1, longitude: 2 },
      ],
    }
    const results = await createOpenMeteoGeocoder(fetchReturning(payload), BASE_URL).search('x')
    expect(results).toEqual([
      { name: 'Warszawa, Mazowieckie, Polska', latitude: 52.23, longitude: 21.01 },
      { name: 'Atlantis', latitude: 1, longitude: 2 },
    ])
  })

  it('returns an empty list when nothing matches', async () => {
    expect(await createOpenMeteoGeocoder(fetchReturning({}), BASE_URL).search('zzz')).toEqual([])
  })

  it('fails on an HTTP error', async () => {
    await expect(createOpenMeteoGeocoder(fetchReturning({}, false, 500), BASE_URL).search('x')).rejects.toThrow('500')
  })

  it('fails on a malformed response', async () => {
    await expect(createOpenMeteoGeocoder(fetchReturning({ results: [{ name: 1 }] }), BASE_URL).search('x')).rejects.toThrow()
  })
})
