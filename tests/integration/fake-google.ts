import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'

export const FAKE_GOOGLE = { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh', accessToken: 'fake-access' }

type StoredEvent = { id: string; [key: string]: unknown }

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

const readBody = (request: IncomingMessage): Promise<string> =>
  new Promise((resolve) => {
    let body = ''
    request.on('data', (chunk) => (body += chunk))
    request.on('end', () => resolve(body))
  })

function send(response: ServerResponse, status: number, body?: unknown) {
  response.writeHead(status, { ...CORS, ...(body === undefined ? {} : { 'content-type': 'application/json' }) })
  response.end(body === undefined ? undefined : JSON.stringify(body))
}

function seedEventToday(): StoredEvent {
  const today = new Date()
  const at = (hour: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour).toISOString()
  return {
    id: 'seed1',
    summary: 'Z Google',
    start: { dateTime: at(10) },
    end: { dateTime: at(11) },
    extendedProperties: { private: { fhcTags: 'jan' } },
    attendees: [{ email: 'someone@example.com' }],
  }
}

/** A stand-in for Google's token endpoint and Calendar API, with two calendars, kept in memory. Fake credentials only. */
export function startFakeGoogleServer(port: number): Promise<Server> {
  const calendars = new Map<string, StoredEvent[]>()
  let counter = 0
  const reset = () => {
    calendars.set('family@example.com', [seedEventToday()])
    calendars.set('holidays@example.com', [])
    counter = 0
  }
  reset()

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
    if (request.method === 'OPTIONS') return send(response, 204)
    if (url.pathname === '/__reset') {
      reset()
      return send(response, 204)
    }

    if (url.pathname === '/token') {
      const form = new URLSearchParams(await readBody(request))
      const valid =
        form.get('grant_type') === 'refresh_token' &&
        form.get('client_id') === FAKE_GOOGLE.clientId &&
        form.get('client_secret') === FAKE_GOOGLE.clientSecret &&
        form.get('refresh_token') === FAKE_GOOGLE.refreshToken
      return valid ? send(response, 200, { access_token: FAKE_GOOGLE.accessToken, expires_in: 3600, token_type: 'Bearer' }) : send(response, 400, { error: 'invalid_grant' })
    }

    if (request.headers.authorization !== `Bearer ${FAKE_GOOGLE.accessToken}`) return send(response, 401, { error: 'unauthorized' })

    if (url.pathname === '/calendar/v3/users/me/calendarList') {
      return send(response, 200, {
        items: [
          { id: 'family@example.com', summary: 'Rodzina', accessRole: 'owner', primary: true, selected: true },
          { id: 'holidays@example.com', summary: 'Święta', accessRole: 'reader' },
        ],
      })
    }

    const match = /^\/calendar\/v3\/calendars\/([^/]+)\/events(?:\/([^/]+))?$/.exec(url.pathname)
    const events = match === null ? undefined : calendars.get(decodeURIComponent(match[1]))
    if (match === null || events === undefined) return send(response, 404, { error: 'not found' })
    const eventId = match[2] === undefined ? undefined : decodeURIComponent(match[2])
    const index = eventId === undefined ? -1 : events.findIndex((event) => event.id === eventId)

    if (eventId === undefined) {
      if (request.method === 'GET') return send(response, 200, { items: events })
      const created = { ...JSON.parse(await readBody(request)), id: `fake${++counter}` } as StoredEvent
      events.push(created)
      return send(response, 200, created)
    }
    if (index === -1) return send(response, 404, { error: 'not found' })
    if (request.method === 'GET') return send(response, 200, events[index])
    if (request.method === 'PUT') {
      events[index] = { ...JSON.parse(await readBody(request)), id: eventId } as StoredEvent
      return send(response, 200, events[index])
    }
    events.splice(index, 1)
    return send(response, 204)
  })
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)))
}
