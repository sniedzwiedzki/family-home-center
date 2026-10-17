import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest'

const run = promisify(execFile)
const SESSION = `fhc-integration-${process.pid}`
const KIOSK_WIDTH = '2400'
const KIOSK_HEIGHT = '1600'
const SETTLE_MS = '1000'

async function agentBrowser(...args: string[]): Promise<string> {
  const { stdout } = await run('npx', ['agent-browser', '--session', SESSION, ...args])
  return stdout
}

async function evaluate<T>(expression: string): Promise<T> {
  return JSON.parse((await agentBrowser('eval', expression)).trim()) as T
}

describe('app on the kiosk display', () => {
  beforeEach(async () => {
    await agentBrowser('set', 'viewport', KIOSK_WIDTH, KIOSK_HEIGHT)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
  })

  afterAll(async () => {
    await agentBrowser('close')
  })

  it('renders the shell in Polish', async () => {
    expect(await agentBrowser('get', 'text', '.column-header[data-column="other"]')).toContain('Inne')
    expect(await agentBrowser('snapshot', '-i')).toContain('Ustawienia')
    expect(await agentBrowser('get', 'text', '.is-today .day-label')).toMatch(
      /poniedziałek|wtorek|środa|czwartek|piątek|sobota|niedziela/,
    )
  })

  it('scrolls today right under the sticky column headers', async () => {
    const gap = await evaluate<number>(
      "document.querySelector('.is-today').getBoundingClientRect().top - document.querySelector('.column-headers').getBoundingClientRect().bottom",
    )
    expect(Math.abs(gap)).toBeLessThan(4)
  })

  it('loads more days when scrolling to the top', async () => {
    const countRows = "document.querySelectorAll('.day-row').length"
    const before = await evaluate<number>(countRows)
    await agentBrowser('eval', "document.querySelector('main').scrollTop = 0")
    await agentBrowser('wait', SETTLE_MS)
    expect(await evaluate<number>(countRows)).toBeGreaterThan(before)
  })

  it('shows the forecast in the day rows and in the 24h bottom bar once a location is set', async () => {
    const settings = {
      familyMembers: [],
      calendars: { readIds: [], writeId: null },
      weather: { location: { name: 'Warszawa', latitude: 52.23, longitude: 21.01 } },
      pin: null,
    }
    await agentBrowser('eval', `localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(settings))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      expect(await evaluate<number>("document.querySelectorAll('.forecast-slot').length")).toBe(12)
      expect(await evaluate<number>("document.querySelectorAll('.day-weather').length")).toBeGreaterThan(0)
      expect(await agentBrowser('get', 'text', '.is-today .day-weather')).toContain('20° / 10°')
      expect(await agentBrowser('get', 'text', '.forecast-slot .slot-temp')).toContain('15°')
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })
})
