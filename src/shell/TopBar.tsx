import { formatClock } from '../shared/format'
import { useNow } from './useNow'

export function TopBar() {
  const now = useNow()

  return (
    <header className="top-bar">
      <time className="clock" dateTime={now.toISOString()}>
        {formatClock(now)}
      </time>
      <button type="button" className="settings-button" aria-label="Ustawienia" disabled>
        ⚙
      </button>
    </header>
  )
}
