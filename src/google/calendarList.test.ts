import { describe, expect, it, vi } from 'vitest'
import { createConnectionCheck } from './calendarList'

const credentials = { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

function check(handler: (url: string) => Response | Promise<Response>) {
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => handler(String(input)))
  return {
    fetchImpl,
    run: createConnectionCheck({ fetchImpl: fetchImpl as unknown as typeof fetch, tokenUrl: 'https://token.example/token', calendarUrl: 'https://api.example/v3', now: () => 0 })(credentials),
  }
}

const token = () => json({ access_token: 'access', expires_in: 3600 })

describe('createConnectionCheck', () => {
  it('signs in and lists the calendars with their names, rights and Google selection', async () => {
    const { run, fetchImpl } = check((url) => {
      if (url.includes('/token')) return token()
      return json({
        items: [
          { id: 'me@x', summary: 'Ja', accessRole: 'owner', primary: true, selected: true },
          { id: 'family@x', summary: 'Rodzina', summaryOverride: 'Dom', accessRole: 'writer', selected: true },
          { id: 'holidays@x', summary: 'Święta', accessRole: 'reader' },
          { id: 'free@x', accessRole: 'freeBusyReader' },
        ],
      })
    })
    expect(await run).toEqual([
      { id: 'me@x', name: 'Ja', canWrite: true, selected: true, primary: true },
      { id: 'family@x', name: 'Dom', canWrite: true, selected: true, primary: false },
      { id: 'holidays@x', name: 'Święta', canWrite: false, selected: false, primary: false },
      { id: 'free@x', name: 'free@x', canWrite: false, selected: false, primary: false },
    ])
    const listUrl = String(fetchImpl.mock.calls[1][0])
    expect(listUrl).toContain('https://api.example/v3/users/me/calendarList?')
    expect(listUrl).toContain('minAccessRole=reader')
  })

  it('follows the pages', async () => {
    let page = 0
    const { run, fetchImpl } = check((url) => {
      if (url.includes('/token')) return token()
      page += 1
      return json(page === 1 ? { items: [{ id: 'a', accessRole: 'owner' }], nextPageToken: 'more' } : { items: [{ id: 'b', accessRole: 'owner' }] })
    })
    expect((await run).map((calendar) => calendar.id)).toEqual(['a', 'b'])
    expect(String(fetchImpl.mock.calls[2][0])).toContain('pageToken=more')
  })

  it('handles an account without calendars', async () => {
    const { run } = check((url) => (url.includes('/token') ? token() : json({})))
    expect(await run).toEqual([])
  })

  it('explains a refresh token that no longer works', async () => {
    const { run } = check(() => json({ error: 'invalid_grant' }, 400))
    await expect(run).rejects.toThrow('Token odświeżania wygasł lub został cofnięty')
  })

  it('explains missing permissions', async () => {
    const { run } = check((url) => (url.includes('/token') ? token() : json({}, 403)))
    await expect(run).rejects.toThrow('Brak uprawnień (403)')
  })
})
