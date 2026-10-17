import { useMemo, useState } from 'react'
import { CalendarView } from './calendar/CalendarView'
import { createLocalCalendar } from './calendar/localCalendar'
import { SettingsDialog } from './settings/SettingsDialog'
import { useSettings } from './settings/useSettings'
import { BottomBar } from './shell/BottomBar'
import { TopBar } from './shell/TopBar'
import { createOpenMeteoClient } from './weather/openMeteoClient'
import { createOpenMeteoGeocoder } from './weather/openMeteoGeocoder'
import { useForecast } from './weather/useForecast'
import './App.css'

const calendarPort = createLocalCalendar(window.localStorage)
const weatherPort = createOpenMeteoClient(fetch.bind(globalThis), __WEATHER_BASE_URL__)
const geocoder = createOpenMeteoGeocoder(fetch.bind(globalThis), __GEOCODING_BASE_URL__)

function App() {
  const { settings, updateSettings } = useSettings()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const forecast = useForecast(weatherPort, settings.weather.location)
  const forecasts = useMemo(() => new Map((forecast?.days ?? []).map((day) => [day.day, day])), [forecast])

  return (
    <div className="kiosk">
      <TopBar onOpenSettings={() => setIsSettingsOpen(true)} />
      <CalendarView port={calendarPort} members={settings.familyMembers} forecasts={forecasts} />
      <BottomBar forecast={forecast} />
      {isSettingsOpen && (
        <SettingsDialog settings={settings} geocoder={geocoder} onChange={updateSettings} onClose={() => setIsSettingsOpen(false)} />
      )}
    </div>
  )
}

export default App
