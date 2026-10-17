import { useMemo } from 'react'
import { CalendarView } from './calendar/CalendarView'
import { createMockCalendar } from './calendar/mockCalendar'
import { useSettings } from './settings/useSettings'
import { BottomBar } from './shell/BottomBar'
import { TopBar } from './shell/TopBar'
import { createOpenMeteoClient } from './weather/openMeteoClient'
import { useForecast } from './weather/useForecast'
import './App.css'

const calendarPort = createMockCalendar()
const weatherPort = createOpenMeteoClient(fetch.bind(globalThis), __WEATHER_BASE_URL__)

function App() {
  const { settings } = useSettings()
  const forecast = useForecast(weatherPort, settings.weather.location)
  const forecasts = useMemo(() => new Map((forecast?.days ?? []).map((day) => [day.day, day])), [forecast])

  return (
    <div className="kiosk">
      <TopBar />
      <CalendarView port={calendarPort} members={settings.familyMembers} forecasts={forecasts} />
      <BottomBar forecast={forecast} />
    </div>
  )
}

export default App
