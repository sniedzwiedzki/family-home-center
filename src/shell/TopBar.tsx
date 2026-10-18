import { useEffect, useState } from 'react'
import { formatClock } from '../shared/format'
import { useNow } from './useNow'

// Same length as the `refresh-spin` animation in App.css.
const SPIN_MS = 800

interface TopBarProps {
  onOpenSettings: () => void
  /** Reloads the calendar and the weather right away. */
  onRefresh: () => void
}

export function TopBar({ onOpenSettings, onRefresh }: TopBarProps) {
  const now = useNow()
  const [isSpinning, setIsSpinning] = useState(false)

  useEffect(() => {
    if (!isSpinning) return
    const timer = window.setTimeout(() => setIsSpinning(false), SPIN_MS)
    return () => window.clearTimeout(timer)
  }, [isSpinning])

  return (
    <header className="top-bar">
      <div />
      <time className="clock" dateTime={now.toISOString()}>
        {formatClock(now)}
      </time>
      <div className="top-bar-actions">
        <button
          type="button"
          className={isSpinning ? 'refresh-button is-spinning' : 'refresh-button'}
          aria-label="Odśwież"
          onClick={() => {
            setIsSpinning(true)
            onRefresh()
          }}
        >
          ↻
        </button>
        <button type="button" className="settings-button" aria-label="Ustawienia" onClick={onOpenSettings}>
          ⚙
        </button>
      </div>
    </header>
  )
}
