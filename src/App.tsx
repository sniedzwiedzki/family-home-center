import { CalendarView } from './calendar/CalendarView'
import { createMockCalendar } from './calendar/mockCalendar'
import { useSettings } from './settings/useSettings'
import { BottomBar } from './shell/BottomBar'
import { TopBar } from './shell/TopBar'
import './App.css'

const calendarPort = createMockCalendar()

function App() {
  const { settings } = useSettings()

  return (
    <div className="kiosk">
      <TopBar />
      <CalendarView port={calendarPort} members={settings.familyMembers} />
      <BottomBar />
    </div>
  )
}

export default App
