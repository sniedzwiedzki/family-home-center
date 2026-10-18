import { execFile } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeEach, describe, expect, inject, it } from 'vitest'
import { FAKE_GOOGLE } from './fake-google.ts'

const run = promisify(execFile)
const SESSION = `fhc-integration-${process.pid}`
const KIOSK_WIDTH = '1600'
const KIOSK_HEIGHT = '2400'
const SETTLE_MS = '1000'

async function agentBrowser(...args: string[]): Promise<string> {
  const { stdout } = await run('npx', ['agent-browser', '--session', SESSION, ...args])
  return stdout
}

async function evaluate<T>(expression: string): Promise<T> {
  return JSON.parse((await agentBrowser('eval', expression)).trim()) as T
}

const SETTINGS_WITH_FIVE_PEOPLE = {
  familyMembers: [
    { id: 'm1', name: 'Anna', tag: 'anna', color: '#f4a3a8' },
    { id: 'm2', name: 'Jan', tag: 'jan', color: '#9ec5f0' },
    { id: 'm3', name: 'Ola', tag: 'ola', color: '#a8d8b9' },
    { id: 'm4', name: 'Tomek', tag: 'tomek', color: '#f6d58f' },
    { id: 'm5', name: 'Zosia', tag: 'zosia', color: '#c9b3e6' },
  ],
  calendars: { readIds: [], writeId: null },
  weather: { location: { name: 'Warszawa', latitude: 52.23, longitude: 21.01 } },
  pin: null,
}

const GOOGLE_CREDENTIALS = { clientId: FAKE_GOOGLE.clientId, clientSecret: FAKE_GOOGLE.clientSecret, refreshToken: FAKE_GOOGLE.refreshToken }
const SETTINGS_WITH_GOOGLE = {
  ...SETTINGS_WITH_FIVE_PEOPLE,
  google: GOOGLE_CREDENTIALS,
  calendars: {
    readIds: ['family@example.com'],
    writeId: 'family@example.com',
    known: [
      { id: 'family@example.com', name: 'Rodzina', canWrite: true },
      { id: 'holidays@example.com', name: 'Święta', canWrite: false },
    ],
  },
}

const pad = (value: number) => String(value).padStart(2, '0')
const today = new Date()
const TODAY_KEY = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`

const SCREENSHOT_DIR = resolve('tests/integration/screenshots')

async function screenshot(name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true })
  await agentBrowser('screenshot', resolve(SCREENSHOT_DIR, `${name}.png`))
}

const clickButton = (text: string) =>
  agentBrowser(
    'eval',
    `[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(text)} || b.getAttribute('aria-label') === ${JSON.stringify(text)}).click()`,
  )

const fillField = (label: string, value: string) =>
  agentBrowser(
    'eval',
    `(() => {
      const input = [...document.querySelectorAll('label')].find((l) => l.textContent.trim().startsWith(${JSON.stringify(label)})).querySelector('input')
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(value)})
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })()`,
  )

async function enterPin(pin: string) {
  for (const digit of pin) await clickButton(digit)
  await clickButton('OK')
}

describe('app on the kiosk display', () => {
  beforeEach(async () => {
    await fetch(`${inject('googleUrl')}/__reset`, { method: 'POST' })
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
    expect((await agentBrowser('get', 'text', '.is-today .day-weekday')).trim()).toMatch(/^(po|wt|śr|cz|pt|so|nd)$/)
    expect(await evaluate<number>("document.querySelectorAll('.month-label').length")).toBeGreaterThanOrEqual(2)
    await screenshot('calendar')
  })

  it('scrolls today right under the sticky column headers', async () => {
    const gap = await evaluate<number>(
      "document.querySelector('.is-today').getBoundingClientRect().top - document.querySelector('.column-headers').getBoundingClientRect().bottom",
    )
    expect(Math.abs(gap)).toBeLessThan(4)
  })

  it('keeps today pinned to the top or bottom edge and returns to it on click', async () => {
    const isPinned = (placement: string) => evaluate<boolean>(`document.querySelector('.pin-${placement} .day-row.is-today') !== null`)
    const gapToHeader = "document.querySelector('.day-row.is-today:not(.is-pinned)').getBoundingClientRect().top - document.querySelector('.column-headers').getBoundingClientRect().bottom"

    await agentBrowser('eval', "document.querySelector('main').scrollTop += 4000")
    await agentBrowser('wait', SETTLE_MS)
    await screenshot('today-pinned-top')
    expect(await isPinned('top')).toBe(true)

    // The compact rows mean one batch of past days fits on screen, so load a few batches before today is below the view.
    for (let batch = 0; batch < 3; batch++) {
      await agentBrowser('eval', "document.querySelector('main').scrollTop = 0")
      await agentBrowser('wait', SETTLE_MS)
    }
    await screenshot('today-pinned-bottom')
    expect(await evaluate<object>("({ scrollTop: document.querySelector('main').scrollTop, todayTop: document.querySelector('.day-row.is-today:not(.is-pinned)').getBoundingClientRect().top, pins: document.querySelectorAll('.pin').length })")).toMatchObject({})
    expect(await isPinned('bottom')).toBe(true)

    await agentBrowser('eval', "document.querySelector('.pin-inner').click()")
    await agentBrowser('wait', '2500')
    expect(await isPinned('bottom')).toBe(false)
    expect(Math.abs(await evaluate<number>(gapToHeader))).toBeLessThan(4)
    await screenshot('today-after-return')
  })

  it('loads more days when scrolling to the top', async () => {
    const countRows = "document.querySelectorAll('.day-row').length"
    const before = await evaluate<number>(countRows)
    await agentBrowser('eval', "document.querySelector('main').scrollTop = 0")
    await agentBrowser('wait', SETTLE_MS)
    expect(await evaluate<number>(countRows)).toBeGreaterThan(before)
  })

  it('shows the forecast in the day rows and in the 24h bottom bar once a location is set', async () => {
    await agentBrowser('eval', `localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(SETTINGS_WITH_FIVE_PEOPLE))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      expect(await evaluate<number>("document.querySelectorAll('.forecast-slot').length")).toBe(12)
      expect(await evaluate<number>("document.querySelectorAll('.day-weather').length")).toBeGreaterThan(0)
      expect(await agentBrowser('get', 'text', '.is-today .day-weather')).toContain('20°/10°')
      expect(await agentBrowser('get', 'text', '.forecast-slot .slot-temp')).toContain('15°')
      await screenshot('five-people-portrait')
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('sets up family members, location and PIN through the settings and locks them again', async () => {
    await agentBrowser('eval', 'localStorage.clear()')
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      await clickButton('Ustawienia')
      await enterPin('1234')
      await enterPin('1234')
      await screenshot('settings-pin-created')
      await clickButton('Dodaj osobę')
      await fillField('Imię', 'Anna')
      await fillField('Tag', 'anna')
      await fillField('Szukaj miejscowości', 'Gdańsk')
      await clickButton('Szukaj')
      await agentBrowser('wait', SETTLE_MS)
      await clickButton('Gdańsk, Pomorskie, Polska')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)

      expect(await evaluate<string[]>("[...document.querySelectorAll('.column-name')].map((h) => h.textContent)")).toEqual(['Anna', 'Inne'])
      expect(await evaluate<number>("document.querySelectorAll('.forecast-slot').length")).toBe(12)
      await screenshot('calendar-with-family-and-weather')

      await clickButton('Ustawienia')
      await enterPin('0000')
      expect(await agentBrowser('get', 'text', '[role="alert"]')).toContain('Nieprawidłowy PIN')
      await enterPin('1234')
      expect(await evaluate<boolean>("[...document.querySelectorAll('button')].some((b) => b.textContent.trim() === 'Zapisz')")).toBe(true)
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('adds an event from a person column, edits it, keeps it after a reload and deletes it', async () => {
    const eventTitles = `[...document.querySelectorAll('.day-row[data-day="${TODAY_KEY}"] .event-title')].map((e) => e.textContent)`
    const pressedPeople = "[...document.querySelectorAll('.person-toggle')].filter((b) => b.getAttribute('aria-pressed') === 'true').map((b) => b.textContent)"
    const dialogOpen = (name: string) => evaluate<boolean>(`document.querySelector('[role="dialog"][aria-label="${name}"]') !== null`)

    await agentBrowser('eval', `localStorage.clear(); localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(SETTINGS_WITH_FIVE_PEOPLE))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .day-cell[data-column="m2"]').click()`)
      expect(await dialogOpen('Nowe wydarzenie')).toBe(true)
      expect(await evaluate<string[]>(pressedPeople)).toEqual(['Jan'])

      await clickButton('Ola')
      await fillField('Tytuł', 'Dentysta')
      await screenshot('event-dialog')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)
      expect(await dialogOpen('Nowe wydarzenie')).toBe(false)
      expect(await evaluate<string[]>(eventTitles)).toEqual(['Dentysta', 'Dentysta'])
      await screenshot('calendar-with-event')

      await agentBrowser('open', inject('appUrl'))
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<string[]>(eventTitles)).toEqual(['Dentysta', 'Dentysta'])

      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .event').click()`)
      expect(await dialogOpen('Edytuj wydarzenie')).toBe(true)
      expect(await evaluate<string[]>(pressedPeople)).toEqual(['Jan', 'Ola'])
      await fillField('Tytuł', 'Dentysta u Kowalskiego')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<string[]>(eventTitles)).toEqual(['Dentysta u Kowalskiego', 'Dentysta u Kowalskiego'])

      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .event').click()`)
      await clickButton('Usuń')
      await clickButton('Na pewno usunąć?')
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<string[]>(eventTitles)).toEqual([])
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('shows Google events and adds, edits and deletes them through the Google API', async () => {
    const titlesIn = (column: string) =>
      evaluate<string[]>(`[...document.querySelectorAll('.day-row[data-day="${TODAY_KEY}"] .day-cell[data-column="${column}"] .event-title')].map((e) => e.textContent)`)

    await agentBrowser('eval', `localStorage.clear(); localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(SETTINGS_WITH_GOOGLE))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      expect(await titlesIn('m2')).toEqual(['Z Google'])

      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .day-cell[data-column="m3"]').click()`)
      await fillField('Tytuł', 'Z tabletu')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)
      expect(await titlesIn('m3')).toEqual(['Z tabletu'])
      await screenshot('google-events')

      await agentBrowser('open', inject('appUrl'))
      await agentBrowser('wait', SETTLE_MS)
      expect(await titlesIn('m3')).toEqual(['Z tabletu'])
      expect(await evaluate<boolean>("localStorage.getItem('fhc.events.v1') === null")).toBe(true)

      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .day-cell[data-column="m3"] .event').click()`)
      await fillField('Tytuł', 'Z tabletu (zmiana)')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)
      expect(await titlesIn('m3')).toEqual(['Z tabletu (zmiana)'])

      await agentBrowser('eval', `document.querySelector('.day-row[data-day="${TODAY_KEY}"] .day-cell[data-column="m2"] .event').click()`)
      await clickButton('Usuń')
      await clickButton('Na pewno usunąć?')
      await agentBrowser('wait', SETTLE_MS)
      expect(await titlesIn('m2')).toEqual([])
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('connects to Google from the settings, lists the calendars and starts using them', async () => {
    const settings = { ...SETTINGS_WITH_FIVE_PEOPLE, pin: '1234' }
    await agentBrowser('eval', `localStorage.clear(); localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(settings))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      await clickButton('Ustawienia')
      await enterPin('1234')
      await fillField('Identyfikator klienta', FAKE_GOOGLE.clientId)
      await fillField('Sekret klienta', FAKE_GOOGLE.clientSecret)
      await fillField('Token odświeżania', FAKE_GOOGLE.refreshToken)
      await clickButton('Sprawdź połączenie')
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<boolean>("document.body.innerText.includes('Połączono. Liczba kalendarzy: 2.')")).toBe(true)
      expect(await evaluate<string[]>("[...document.querySelectorAll('.calendar-choices input[type=checkbox]')].map((c) => c.checked ? 'on' : 'off')")).toEqual(['on', 'off'])
      await screenshot('settings-google')
      await clickButton('Zapisz')
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<string>("JSON.parse(localStorage.getItem('fhc.settings.v1')).calendars.writeId")).toBe('family@example.com')
      expect(
        await evaluate<string[]>(`[...document.querySelectorAll('.day-row[data-day="${TODAY_KEY}"] .event-title')].map((e) => e.textContent)`),
      ).toEqual(['Z Google'])
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('explains in Polish when Google rejects the refresh token', async () => {
    const settings = { ...SETTINGS_WITH_FIVE_PEOPLE, pin: '1234' }
    await agentBrowser('eval', `localStorage.clear(); localStorage.setItem('fhc.settings.v1', ${JSON.stringify(JSON.stringify(settings))})`)
    await agentBrowser('open', inject('appUrl'))
    await agentBrowser('wait', SETTLE_MS)
    try {
      await clickButton('Ustawienia')
      await enterPin('1234')
      await fillField('Identyfikator klienta', FAKE_GOOGLE.clientId)
      await fillField('Sekret klienta', FAKE_GOOGLE.clientSecret)
      await fillField('Token odświeżania', 'revoked-token')
      await clickButton('Sprawdź połączenie')
      await agentBrowser('wait', SETTLE_MS)
      expect(await evaluate<boolean>("document.body.innerText.includes('Token odświeżania wygasł lub został cofnięty')")).toBe(true)
    } finally {
      await agentBrowser('eval', 'localStorage.clear()')
    }
  })

  it('serves the privacy policy page that the Google consent screen links to', async () => {
    const response = await fetch(`${inject('appUrl')}/privacy.html`)
    const page = await response.text()
    expect(response.ok).toBe(true)
    expect(page).toContain('Family Home Center: privacy policy')
    expect(page).toContain('Family Home Center: polityka prywatności')
    expect(page).toContain('calendar.events')
    expect(page).toContain('Limited Use')
  })
})
