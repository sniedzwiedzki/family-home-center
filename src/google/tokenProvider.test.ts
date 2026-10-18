import { describe, expect, it, vi } from 'vitest'
import { UserFacingError } from '../shared/userFacingError'
import { createTokenProvider } from './tokenProvider'

const credentials = { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh' }
const TOKEN_URL = 'https://token.example/token'
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const grant = (token = 'access-1', expiresIn = 3600) => json({ access_token: token, expires_in: expiresIn, token_type: 'Bearer' })

function provider(fetchImpl: typeof fetch, now: () => number = () => 0) {
  return createTokenProvider({ fetchImpl, tokenUrl: TOKEN_URL, credentials, now })
}

describe('createTokenProvider', () => {
  it('exchanges the refresh token for an access token', async () => {
    const fetchImpl = vi.fn(async () => grant())
    expect(await provider(fetchImpl)()).toBe('access-1')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(TOKEN_URL)
    expect(init.method).toBe('POST')
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: 'refresh_token',
      client_id: 'fake-client',
      client_secret: 'fake-secret',
      refresh_token: 'fake-refresh',
    })
  })

  it('reuses the token until a minute before it expires, then asks again', async () => {
    let time = 0
    const fetchImpl = vi.fn().mockResolvedValueOnce(grant('first', 3600)).mockResolvedValueOnce(grant('second', 3600))
    const getToken = provider(fetchImpl as unknown as typeof fetch, () => time)
    expect(await getToken()).toBe('first')
    time = 3_500_000
    expect(await getToken()).toBe('first')
    time = 3_545_000
    expect(await getToken()).toBe('second')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('shares one request between concurrent callers', async () => {
    const fetchImpl = vi.fn(async () => grant())
    const getToken = provider(fetchImpl)
    expect(await Promise.all([getToken(), getToken(), getToken()])).toEqual(['access-1', 'access-1', 'access-1'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['invalid_grant', 400, 'Token odświeżania wygasł lub został cofnięty. Wygeneruj nowy w OAuth Playground.'],
    ['invalid_client', 401, 'Nieprawidłowy identyfikator lub sekret klienta Google.'],
    ['access_denied', 400, 'Google odrzuciło logowanie (access_denied).'],
  ])('explains %s in Polish', async (code, status, message) => {
    const getToken = provider(vi.fn(async () => json({ error: code }, status)))
    await expect(getToken()).rejects.toThrow(message)
    await expect(getToken()).rejects.toBeInstanceOf(UserFacingError)
  })

  it('falls back to the status when the error body is not JSON', async () => {
    const getToken = provider(vi.fn(async () => new Response('<html>oops</html>', { status: 502 })))
    await expect(getToken()).rejects.toThrow('Google odrzuciło logowanie (502).')
  })

  it('falls back to the status when the error body has an unexpected shape', async () => {
    const getToken = provider(vi.fn(async () => json({ error: 42 }, 500)))
    await expect(getToken()).rejects.toThrow('Google odrzuciło logowanie (500).')
  })

  it('reports a missing connection', async () => {
    const getToken = provider(vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    await expect(getToken()).rejects.toThrow('Brak połączenia z serwerami Google.')
  })

  it('tries again after a failure instead of remembering it', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(json({ error: 'invalid_grant' }, 400)).mockResolvedValueOnce(grant('recovered'))
    const getToken = provider(fetchImpl as unknown as typeof fetch)
    await expect(getToken()).rejects.toThrow()
    expect(await getToken()).toBe('recovered')
  })

  it('rejects a success response without a token', async () => {
    const getToken = provider(vi.fn(async () => json({ nothing: true })))
    await expect(getToken()).rejects.toThrow()
  })
})
