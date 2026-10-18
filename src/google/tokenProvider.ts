import { z } from 'zod'
import { UserFacingError } from '../shared/userFacingError'

export interface GoogleCredentials {
  clientId: string
  clientSecret: string
  refreshToken: string
}

interface TokenProviderOptions {
  fetchImpl: typeof fetch
  tokenUrl: string
  credentials: GoogleCredentials
  now: () => number
}

const EXPIRY_MARGIN_MS = 60_000

const tokenResponseSchema = z.object({ access_token: z.string().min(1), expires_in: z.number().positive() })
const errorBodySchema = z.object({ error: z.string().optional() })

async function failureFor(response: Response): Promise<UserFacingError> {
  const parsed = errorBodySchema.safeParse(await response.json().catch(() => ({})))
  const code = parsed.success ? parsed.data.error : undefined
  if (code === 'invalid_grant') return new UserFacingError('Token odświeżania wygasł lub został cofnięty. Wygeneruj nowy w OAuth Playground.')
  if (code === 'invalid_client') return new UserFacingError('Nieprawidłowy identyfikator lub sekret klienta Google.')
  return new UserFacingError(`Google odrzuciło logowanie (${code ?? response.status}).`)
}

/** Returns a function that always yields a valid access token, refreshing it with the stored refresh token when needed. */
export function createTokenProvider({ fetchImpl, tokenUrl, credentials, now }: TokenProviderOptions): () => Promise<string> {
  let cached: { token: string; expiresAt: number } | null = null
  let pending: Promise<string> | null = null

  const refresh = async (): Promise<string> => {
    let response: Response
    try {
      response = await fetchImpl(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          refresh_token: credentials.refreshToken,
        }),
      })
    } catch (error) {
      throw new UserFacingError('Brak połączenia z serwerami Google.', { cause: error })
    }
    if (!response.ok) throw await failureFor(response)
    const { access_token, expires_in } = tokenResponseSchema.parse(await response.json())
    cached = { token: access_token, expiresAt: now() + expires_in * 1000 }
    return access_token
  }

  return async () => {
    if (cached !== null && cached.expiresAt - EXPIRY_MARGIN_MS > now()) return cached.token
    pending ??= refresh().finally(() => {
      pending = null
    })
    return pending
  }
}
