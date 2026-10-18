import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { UserFacingError } from '../shared/userFacingError'
import { createGoogleApi, GoogleApiError } from './googleApi'

const BASE = 'https://api.example/calendar/v3'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const itemSchema = z.object({ name: z.string() })

function api(fetchImpl: ReturnType<typeof vi.fn>) {
  return createGoogleApi({ fetchImpl: fetchImpl as unknown as typeof fetch, baseUrl: BASE, getAccessToken: async () => 'token-1' })
}
const lastCall = (fetchImpl: ReturnType<typeof vi.fn>) => fetchImpl.mock.calls.at(-1) as unknown as [string, RequestInit]

describe('createGoogleApi', () => {
  it('sends GET requests with the bearer token and the query, and validates the answer', async () => {
    const fetchImpl = vi.fn(async () => json({ name: 'x' }))
    expect(await api(fetchImpl).getJson('/things', itemSchema, { a: '1', b: 'two words' })).toEqual({ name: 'x' })
    const [url, init] = lastCall(fetchImpl)
    expect(url).toBe(`${BASE}/things?a=1&b=two+words`)
    expect(init.method).toBe('GET')
    expect(init.headers).toEqual({ Authorization: 'Bearer token-1' })
    expect(init.body).toBeUndefined()
  })

  it('omits the query string when there is none', async () => {
    const fetchImpl = vi.fn(async () => json({ name: 'x' }))
    await api(fetchImpl).getJson('/things', itemSchema)
    expect(lastCall(fetchImpl)[0]).toBe(`${BASE}/things`)
  })

  it.each(['POST', 'PUT'] as const)('sends a JSON body with %s', async (method) => {
    const fetchImpl = vi.fn(async () => json({ name: 'saved' }))
    expect(await api(fetchImpl).sendJson(method, '/things/1', { name: 'new' }, itemSchema)).toEqual({ name: 'saved' })
    const [, init] = lastCall(fetchImpl)
    expect(init.method).toBe(method)
    expect(init.body).toBe('{"name":"new"}')
    expect(init.headers).toEqual({ Authorization: 'Bearer token-1', 'Content-Type': 'application/json' })
  })

  it('deletes without a body', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }))
    await api(fetchImpl).remove('/things/1')
    const [url, init] = lastCall(fetchImpl)
    expect(url).toBe(`${BASE}/things/1`)
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it.each([
    [401, 'Google odrzuciło dostęp (401). Sprawdź dane logowania w ustawieniach.'],
    [403, 'Brak uprawnień (403). Sprawdź zakresy tokenu i udostępnienie kalendarza.'],
    [404, 'Nie znaleziono kalendarza lub wydarzenia (404).'],
    [429, 'Google jest chwilowo niedostępne (429). Spróbuj ponownie za chwilę.'],
    [503, 'Google jest chwilowo niedostępne (503). Spróbuj ponownie za chwilę.'],
    [418, 'Google zgłosiło błąd (418).'],
  ])('turns HTTP %i into a Polish message that keeps the status', async (status, message) => {
    const error = await api(vi.fn(async () => json({}, status))).getJson('/x', itemSchema).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(GoogleApiError)
    expect(error).toBeInstanceOf(UserFacingError)
    expect((error as GoogleApiError).status).toBe(status)
    expect((error as GoogleApiError).message).toBe(message)
  })

  it('reports a missing connection', async () => {
    const failing = vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')))
    await expect(api(failing).getJson('/x', itemSchema)).rejects.toThrow('Brak połączenia z serwerami Google.')
  })

  it('rejects an answer that does not match the schema', async () => {
    await expect(api(vi.fn(async () => json({ other: 1 }))).getJson('/x', itemSchema)).rejects.toThrow()
  })
})
