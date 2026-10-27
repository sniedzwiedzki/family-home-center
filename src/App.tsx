import { useMemo, useState } from 'react'
import { AssistantButton } from './assistant/AssistantButton'
import { AssistantDialog } from './assistant/AssistantDialog'
import { createGeminiAssistant } from './assistant/geminiClient'
import { TOOL_DECLARATIONS } from './assistant/tools'
import { createVoiceRecorder } from './assistant/voiceRecorder'
import { CalendarView } from './calendar/CalendarView'
import { createLocalCalendar } from './calendar/localCalendar'
import { SpecialTagContext } from './calendar/specialTag'
import { createConnectionCheck } from './google/calendarList'
import { createGoogleApi } from './google/googleApi'
import { createGoogleCalendar } from './google/googleCalendar'
import { createTokenProvider } from './google/tokenProvider'
import { SettingsDialog } from './settings/SettingsDialog'
import { useFontSizeVariables } from './settings/useFontSizeVariables'
import { useSettings } from './settings/useSettings'
import { BottomBar } from './shell/BottomBar'
import { TopBar } from './shell/TopBar'
import { createOpenMeteoClient } from './weather/openMeteoClient'
import { createOpenMeteoGeocoder } from './weather/openMeteoGeocoder'
import { useForecast } from './weather/useForecast'
import './App.css'

// Looks `fetch` up on every call, so it can be replaced in tests.
const appFetch: typeof fetch = (input, init) => fetch(input, init)

const localCalendar = createLocalCalendar(window.localStorage)
const weatherPort = createOpenMeteoClient(appFetch, __WEATHER_BASE_URL__)
const geocoder = createOpenMeteoGeocoder(appFetch, __GEOCODING_BASE_URL__)
const voiceRecorder = createVoiceRecorder({
  getUserMedia: (constraints) => navigator.mediaDevices.getUserMedia(constraints),
  createRecorder: (stream) => new MediaRecorder(stream),
  createAudioContext: () => new AudioContext(),
  now: Date.now,
})
const checkGoogle = createConnectionCheck({
  fetchImpl: appFetch,
  tokenUrl: __GOOGLE_TOKEN_URL__,
  calendarUrl: __GOOGLE_CALENDAR_URL__,
  now: Date.now,
})

function App() {
  const { settings, updateSettings } = useSettings()
  useFontSizeVariables(settings.fontSizes)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAssistantOpen, setIsAssistantOpen] = useState(false)
  const [refreshSignal, setRefreshSignal] = useState(0)
  const forecast = useForecast(weatherPort, settings.weather.location, refreshSignal)
  const hourForecasts = useMemo(() => new Map((forecast?.hours ?? []).map((hour) => [hour.time.getTime(), hour])), [forecast])
  const forecasts = useMemo(() => new Map((forecast?.days ?? []).map((day) => [day.day, day])), [forecast])

  const { google, calendars } = settings
  const getAccessToken = useMemo(
    () => (google === null ? null : createTokenProvider({ fetchImpl: appFetch, tokenUrl: __GOOGLE_TOKEN_URL__, credentials: google, now: Date.now })),
    [google],
  )
  const calendarPort = useMemo(
    () =>
      getAccessToken === null
        ? localCalendar
        : createGoogleCalendar({
            api: createGoogleApi({ fetchImpl: appFetch, baseUrl: __GOOGLE_CALENDAR_URL__, getAccessToken }),
            readIds: calendars.readIds,
            writeId: calendars.writeId,
          }),
    [getAccessToken, calendars.readIds, calendars.writeId],
  )

  const assistant = useMemo(
    () =>
      settings.gemini === null
        ? null
        : createGeminiAssistant({ fetchImpl: appFetch, baseUrl: __GEMINI_BASE_URL__, apiKey: settings.gemini.apiKey, model: settings.gemini.model, tools: TOOL_DECLARATIONS }),
    [settings.gemini],
  )
  const refresh = () => setRefreshSignal((signal) => signal + 1)

  return (
    <SpecialTagContext.Provider value={settings.specialTag}>
      <div className="kiosk">
        <TopBar onOpenSettings={() => setIsSettingsOpen(true)} onRefresh={refresh} />
        <CalendarView port={calendarPort} members={settings.familyMembers} columnLayout={settings.columns} forecasts={forecasts} hourForecasts={hourForecasts} refreshSignal={refreshSignal} />
        <div className="bottom-area">
          <AssistantButton onOpen={() => setIsAssistantOpen(true)} />
          <BottomBar forecast={forecast} />
        </div>
        {isAssistantOpen && (
          <AssistantDialog
            assistant={assistant}
            recorder={voiceRecorder}
            calendar={calendarPort}
            members={settings.familyMembers}
            onChanged={refresh}
            onClose={() => setIsAssistantOpen(false)}
          />
        )}
        {isSettingsOpen && (
          <SettingsDialog
            settings={settings}
            geocoder={geocoder}
            checkGoogle={checkGoogle}
            onChange={updateSettings}
            onClose={() => setIsSettingsOpen(false)}
          />
        )}
      </div>
    </SpecialTagContext.Provider>
  )
}

export default App
