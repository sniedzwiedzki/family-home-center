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

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const MAX_EXPANDED_DAYS = 400
const pad = (value: number) => String(value).padStart(2, '0')
const compact = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`

/**
 * A stand-in for Google's expansion of a repeating event into occurrences (`singleEvents=true`): the first RRULE line is read for
 * FREQ (weekly, monthly, yearly), BYDAY and UNTIL; the occurrences keep the master's time of day. Occurrences get the id
 * `<master>_<yyyymmdd>` and `recurringEventId`; the master itself is not listed.
 */
function expand(master: StoredEvent, until: Date): StoredEvent[] {
  const rule = (master.recurrence as string[] | undefined)?.find((line) => line.startsWith('RRULE:'))
  if (rule === undefined) return [master]
  const parts = new Map(rule.slice('RRULE:'.length).split(';').map((part) => part.split('=') as [string, string]))
  const times = (key: 'start' | 'end') => {
    const value = master[key] as { date?: string; dateTime?: string }
    return value.dateTime === undefined ? { allDay: true, at: new Date(`${value.date}T00:00:00`) } : { allDay: false, at: new Date(value.dateTime) }
  }
  const start = times('start')
  const end = times('end')
  const lastText = parts.get('UNTIL')
  const last = lastText === undefined ? until : new Date(Number(lastText.slice(0, 4)), Number(lastText.slice(4, 6)) - 1, Number(lastText.slice(6, 8)), 23, 59, 59)
  const days = parts.get('BYDAY')?.split(',')
  const occurrences: StoredEvent[] = []
  for (let offset = 0; offset < MAX_EXPANDED_DAYS; offset++) {
    const day = new Date(start.at.getFullYear(), start.at.getMonth(), start.at.getDate() + offset, start.at.getHours(), start.at.getMinutes())
    if (day > last || day > until) break
    const matches =
      parts.get('FREQ') === 'WEEKLY'
        ? (days ?? [DAY_CODES[start.at.getDay()]]).includes(DAY_CODES[day.getDay()])
        : parts.get('FREQ') === 'MONTHLY'
          ? day.getDate() === start.at.getDate()
          : day.getDate() === start.at.getDate() && day.getMonth() === start.at.getMonth()
    if (!matches) continue
    const shifted = (original: { allDay: boolean; at: Date }, base: Date) =>
      new Date(base.getFullYear(), base.getMonth(), base.getDate() + Math.round((original.at.getTime() - start.at.getTime()) / 86_400_000), original.at.getHours(), original.at.getMinutes())
    const to = shifted(end, day)
    occurrences.push({
      ...master,
      id: `${master.id}_${compact(day)}`,
      recurringEventId: master.id,
      recurrence: undefined,
      start: start.allDay ? { date: `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}` } : { dateTime: day.toISOString() },
      end: end.allDay ? { date: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}` } : { dateTime: to.toISOString() },
    })
  }
  return occurrences
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
      if (request.method === 'GET') {
        const until = new Date(url.searchParams.get('timeMax') ?? Date.now() + 90 * 86_400_000)
        return send(response, 200, { items: events.flatMap((event) => expand(event, until)) })
      }
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
