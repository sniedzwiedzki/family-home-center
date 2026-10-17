import { ColumnHeaders } from './calendar/ColumnHeaders'
import { useSettings } from './settings/useSettings'
import { BottomBar } from './shell/BottomBar'
import { TopBar } from './shell/TopBar'
import './App.css'

function App() {
  const { settings } = useSettings()

  return (
    <div className="kiosk">
      <TopBar />
      <main className="calendar">
        <ColumnHeaders members={settings.familyMembers} />
      </main>
      <BottomBar />
    </div>
  )
}

export default App
