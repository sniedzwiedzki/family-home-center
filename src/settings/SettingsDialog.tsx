import { useState } from 'react'
import type { GeocodingPort } from '../weather/types'
import { PinCreate } from './PinCreate'
import { PinEntry } from './PinEntry'
import type { Settings } from './settings'
import { SettingsForm } from './SettingsForm'
import './settings.css'

interface SettingsDialogProps {
  settings: Settings
  geocoder: GeocodingPort
  onChange: (settings: Settings) => void
  onClose: () => void
}

export function SettingsDialog({ settings, geocoder, onChange, onClose }: SettingsDialogProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)

  const content = isUnlocked ? (
    <SettingsForm settings={settings} geocoder={geocoder} onChange={onChange} onClose={onClose} />
  ) : settings.pin === null ? (
    <PinCreate
      onCreate={(pin) => {
        onChange({ ...settings, pin })
        setIsUnlocked(true)
      }}
    />
  ) : (
    <PinEntry pin={settings.pin} onUnlock={() => setIsUnlocked(true)} />
  )

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Ustawienia">
      <header className="settings-header">
        <h2>Ustawienia</h2>
        <button type="button" onClick={onClose}>
          Zamknij
        </button>
      </header>
      <div className="settings-body">{content}</div>
    </div>
  )
}
