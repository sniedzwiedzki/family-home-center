import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import type { AssistantPort } from './assistant/assistant.port'
import type { VoiceRecorder } from './assistant/voiceRecorder'
import type { CalendarPort } from './calendar/types'
import type { DiscoveredCalendar } from './google/calendarList'
import type { DayForecast, Forecast } from './weather/types'
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './settings/settings'

const forecast: Forecast = { days: [{ day: '2026-10-17', code: 0, tempMax: 20, tempMin: 10 }], hours: [{ time: new Date(2026, 9, 17, 8), code: 0, temp: 12 }] }
const useForecast = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => ({ port: null as unknown, checkGoogle: null as unknown, assistant: null as unknown, recorder: null as unknown }))

vi.mock('./weather/useForecast', () => ({ useForecast }))
vi.mock('./calendar/CalendarView', () => ({
  CalendarView: ({ port, members, forecasts, hourForecasts, refreshSignal }: { port: unknown; members: { name: string }[]; forecasts: ReadonlyMap<string, DayForecast>; hourForecasts: ReadonlyMap<number, unknown>; refreshSignal: number }) => {
    captured.port = port
    return <main data-testid='calendar' data-refresh={refreshSignal} data-hours={[...hourForecasts.keys()].join(',')}>{`${members.map((m) => m.name).join(',')}|${[...forecasts.keys()].join(',')}`}</main>
  },
}))
vi.mock('./settings/SettingsDialog', () => ({
  SettingsDialog: ({ onChange, onClose, checkGoogle }: { onChange: (s: object) => void; onClose: () => void; checkGoogle: unknown }) => {
    captured.checkGoogle = checkGoogle
    return (
    <div role='dialog'>
      <button onClick={() => onChange({ ...DEFAULT_SETTINGS, pin: '5555' })}>zapisz-test</button>
      <button onClick={onClose}>zamknij-test</button>
    </div>
    )
  },
}))
vi.mock('./assistant/AssistantDialog', () => ({
  AssistantDialog: ({ assistant, recorder, calendar, members, onChanged, onClose }: { assistant: unknown; recorder: unknown; calendar: unknown; members: { name: string }[]; onChanged: () => void; onClose: () => void }) => {
    captured.assistant = assistant
    captured.recorder = recorder
    return (
      <div role='dialog' aria-label='asystent' data-calendar={calendar === captured.port ? 'same' : 'other'}>
        <span>{`asystent:${assistant === null ? 'brak' : 'jest'}:${members.map((m) => m.name).join(',')}`}</span>
        <button onClick={onChanged}>zmieniono-test</button>
        <button onClick={onClose}>zamknij-asystenta-test</button>
      </div>
    )
  },
}))
vi.mock('./shell/BottomBar', () => ({
  BottomBar: ({ forecast }: { forecast: Forecast | null }) => <footer data-testid='bottom'>{forecast === null ? 'none' : 'forecast'}</footer>,
}))

const range = { from: new Date(2026, 9, 1), to: new Date(2026, 10, 1) }
const googleSettings = {
  ...DEFAULT_SETTINGS,
  google: { clientId: 'fake-client', clientSecret: 'fake-secret', refreshToken: 'fake-refresh' },
  calendars: { readIds: ['family@x'], writeId: 'family@x', known: [{ id: 'family@x', name: 'Rodzina', canWrite: true }] },
}
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 })

afterEach(() => vi.unstubAllGlobals())

beforeEach(() => {
  window.localStorage.clear()
  useForecast.mockReset().mockReturnValue(null)
})

describe('App', () => {
  it('renders the top bar, the calendar and the bottom bar', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Ustawienia' })).toBeTruthy()
    expect(screen.getByTestId('calendar')).toBeTruthy()
    expect(screen.getByTestId('bottom').textContent).toBe('none')
  })

  it('passes the family members from the settings to the calendar', () => {
    const settings = { ...DEFAULT_SETTINGS, familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }] }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
    render(<App />)
    expect(screen.getByTestId('calendar').textContent).toBe('Anna|')
  })

  it('asks for the forecast of the configured location and passes it down', () => {
    const location = { name: 'Warszawa', latitude: 52.23, longitude: 21.01 }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, weather: { location } }))
    useForecast.mockReturnValue(forecast)
    render(<App />)
    expect(useForecast).toHaveBeenCalledWith(expect.anything(), location, 0)
    expect(screen.getByTestId('calendar').textContent).toBe('|2026-10-17')
    expect(screen.getByTestId('calendar').getAttribute('data-hours')).toBe(String(new Date(2026, 9, 17, 8).getTime()))
    expect(screen.getByTestId('bottom').textContent).toBe('forecast')
  })

  it('opens the settings dialog from the top bar and closes it again', () => {
    render(<App />)
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'zamknij-test' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('persists settings saved from the dialog', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }))
    fireEvent.click(screen.getByRole('button', { name: 'zapisz-test' }))
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY)!).pin).toBe('5555')
  })

  describe('where the calendar gets its events', () => {
    it('keeps events in local storage until Google is configured', async () => {
      render(<App />)
      const port = captured.port as CalendarPort
      const created = await port.createEvent({ title: 'Lokalne', allDay: true, start: new Date(2026, 9, 5), end: new Date(2026, 9, 6) })
      expect(JSON.parse(window.localStorage.getItem('fhc.events.v1')!)[0].id).toBe(created.id)
      expect((await port.listEvents(range)).map((event) => event.title)).toEqual(['Lokalne'])
    })

    it('reads from Google once credentials are saved, signing in with the stored refresh token', async () => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(googleSettings))
      const fetchStub = vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('/token')
          ? json({ access_token: 'access', expires_in: 3600 })
          : json({ items: [{ id: 'g1', summary: 'Z Google', start: { date: '2026-10-05' }, end: { date: '2026-10-06' } }] }),
      )
      vi.stubGlobal('fetch', fetchStub)
      render(<App />)
      const events = await (captured.port as CalendarPort).listEvents(range)
      expect(events.map((event) => event.id)).toEqual(['family@x|g1'])
      const urls = fetchStub.mock.calls.map(([input]) => String(input))
      expect(urls[0]).toBe('https://oauth2.googleapis.com/token')
      expect(urls[1]).toContain('https://www.googleapis.com/calendar/v3/calendars/family%40x/events?')
      expect(window.localStorage.getItem('fhc.events.v1')).toBeNull()
    })

    it('hands the settings a connection check that talks to Google', async () => {
      const found: DiscoveredCalendar[] = [{ id: 'me@x', name: 'Ja', canWrite: true, selected: true, primary: true }]
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL) =>
          String(input).includes('/token')
            ? json({ access_token: 'access', expires_in: 3600 })
            : json({ items: [{ id: 'me@x', summary: 'Ja', accessRole: 'owner', primary: true, selected: true }] }),
        ),
      )
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Ustawienia' }))
      const check = captured.checkGoogle as (credentials: object) => Promise<DiscoveredCalendar[]>
      expect(await check({ clientId: 'a', clientSecret: 'b', refreshToken: 'c' })).toEqual(found)
    })
  })

  it('refreshes the calendar and the weather when the refresh button is pressed', () => {
    render(<App />)
    expect(screen.getByTestId('calendar').getAttribute('data-refresh')).toBe('0')
    expect(useForecast).toHaveBeenLastCalledWith(expect.anything(), null, 0)
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))
    expect(screen.getByTestId('calendar').getAttribute('data-refresh')).toBe('1')
    expect(useForecast).toHaveBeenLastCalledWith(expect.anything(), null, 1)
    fireEvent.click(screen.getByRole('button', { name: 'Odśwież' }))
    expect(screen.getByTestId('calendar').getAttribute('data-refresh')).toBe('2')
  })

  describe('assistant', () => {
    const geminiSettings = { ...DEFAULT_SETTINGS, familyMembers: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }], gemini: { apiKey: 'fake-key', model: 'gemini-x' } }

    it('opens from the top bar without an assistant while there is no Gemini key, and closes again', () => {
      render(<App />)
      expect(screen.queryByRole('dialog', { name: 'asystent' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
      expect(screen.getByText('asystent:brak:')).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'zamknij-asystenta-test' }))
      expect(screen.queryByRole('dialog', { name: 'asystent' })).toBeNull()
    })

    it('gets the family members and the same calendar as the view, and an assistant once a key is saved', () => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(geminiSettings))
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
      expect(screen.getByText('asystent:jest:Anna')).toBeTruthy()
      expect(screen.getByRole('dialog', { name: 'asystent' }).getAttribute('data-calendar')).toBe('same')
    })

    it('talks to Gemini with the saved key and model', async () => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(geminiSettings))
      const fetchStub = vi.fn(async () => json({ steps: [{ type: 'model_output', content: [{ type: 'text', text: 'Cześć' }] }] }))
      vi.stubGlobal('fetch', fetchStub)
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
      const port = captured.assistant as AssistantPort
      const turn = await port.startSession({ now: new Date(), members: [] }).ask({ base64: 'AAAA', mimeType: 'audio/webm' })
      expect(turn.text).toBe('Cześć')
      const [url, init] = fetchStub.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions')
      expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('fake-key')
      expect(JSON.parse(init.body as string).model).toBe('gemini-x')
    })

    it('reloads the calendar when the assistant changed it', () => {
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
      fireEvent.click(screen.getByRole('button', { name: 'zmieniono-test' }))
      expect(screen.getByTestId('calendar').getAttribute('data-refresh')).toBe('1')
    })

    it('records with the browser microphone, recorder and audio context', async () => {
      class FakeRecorder {
        start = vi.fn()
        stop = vi.fn()
        mimeType = 'audio/webm'
      }
      const stream = { getTracks: () => [] } as unknown as MediaStream
      const getUserMedia = vi.fn(async () => stream)
      const createdContexts: object[] = []
      class FakeContext {
        resume = vi.fn(async () => undefined)
        createAnalyser = () => ({ fftSize: 0, getByteTimeDomainData: vi.fn() })
        createMediaStreamSource = () => ({ connect: vi.fn() })
        constructor() {
          createdContexts.push(this)
        }
      }
      vi.stubGlobal('MediaRecorder', FakeRecorder)
      vi.stubGlobal('AudioContext', FakeContext)
      vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } })
      render(<App />)
      fireEvent.click(screen.getByRole('button', { name: 'Asystent AI' }))
      const recording = await (captured.recorder as VoiceRecorder).start()
      expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
      expect(createdContexts).toHaveLength(1)
      recording.cancel()
    })
  })
})
