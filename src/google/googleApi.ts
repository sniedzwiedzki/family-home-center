import type { z } from 'zod'
import { UserFacingError } from '../shared/userFacingError'

export class GoogleApiError extends UserFacingError {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export interface GoogleApi {
  getJson<T>(path: string, schema: z.ZodType<T>, query?: Record<string, string>): Promise<T>
  sendJson<T>(method: 'POST' | 'PUT', path: string, body: unknown, schema: z.ZodType<T>): Promise<T>
  remove(path: string): Promise<void>
}

interface GoogleApiOptions {
  fetchImpl: typeof fetch
  baseUrl: string
  getAccessToken: () => Promise<string>
}

function messageFor(status: number): string {
  if (status === 401) return 'Google odrzuciło dostęp (401). Sprawdź dane logowania w ustawieniach.'
  if (status === 403) return 'Brak uprawnień (403). Sprawdź zakresy tokenu i udostępnienie kalendarza.'
  if (status === 404) return 'Nie znaleziono kalendarza lub wydarzenia (404).'
  if (status === 429 || status >= 500) return `Google jest chwilowo niedostępne (${status}). Spróbuj ponownie za chwilę.`
  return `Google zgłosiło błąd (${status}).`
}

export function createGoogleApi({ fetchImpl, baseUrl, getAccessToken }: GoogleApiOptions): GoogleApi {
  async function call(method: string, path: string, query?: Record<string, string>, body?: unknown): Promise<Response> {
    const token = await getAccessToken()
    const url = `${baseUrl}${path}${query === undefined ? '' : `?${new URLSearchParams(query)}`}`
    let response: Response
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch (error) {
      throw new UserFacingError('Brak połączenia z serwerami Google.', { cause: error })
    }
    if (!response.ok) throw new GoogleApiError(response.status, messageFor(response.status))
    return response
  }

  return {
    getJson: async (path, schema, query) => schema.parse(await (await call('GET', path, query)).json()),
    sendJson: async (method, path, body, schema) => schema.parse(await (await call(method, path, undefined, body)).json()),
    remove: async (path) => {
      await call('DELETE', path)
    },
  }
}
