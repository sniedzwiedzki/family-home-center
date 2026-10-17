import { useState } from 'react'
import { familyMembersSchema } from '../family/familyMember'
import { hasErrors, memberErrors, type DraftMember } from '../family/memberErrors'
import type { GeocodingPort, GeoLocation } from '../weather/types'
import { FamilyMembersEditor } from './FamilyMembersEditor'
import { PinCreate } from './PinCreate'
import type { Settings } from './settings'
import { WeatherLocationEditor } from './WeatherLocationEditor'

interface SettingsFormProps {
  settings: Settings
  geocoder: GeocodingPort
  onChange: (settings: Settings) => void
  onClose: () => void
}

export function SettingsForm({ settings, geocoder, onChange, onClose }: SettingsFormProps) {
  const [members, setMembers] = useState<DraftMember[]>(() => [...settings.familyMembers])
  const [location, setLocation] = useState<GeoLocation | null>(settings.weather.location)
  const [isChangingPin, setIsChangingPin] = useState(false)
  const errors = memberErrors(members)

  const save = () => {
    onChange({ ...settings, familyMembers: familyMembersSchema.parse(members), weather: { location } })
    onClose()
  }

  if (isChangingPin) {
    return (
      <PinCreate
        onCreate={(pin) => {
          onChange({ ...settings, pin })
          setIsChangingPin(false)
        }}
      />
    )
  }

  return (
    <div className="settings-form">
      <FamilyMembersEditor members={members} errors={errors} onChange={setMembers} />
      <WeatherLocationEditor value={location} geocoder={geocoder} onChange={setLocation} />
      <section className="settings-section">
        <h3>Zabezpieczenie</h3>
        <button type="button" onClick={() => setIsChangingPin(true)}>
          Zmień PIN
        </button>
      </section>
      <div className="settings-actions">
        <button type="button" disabled={hasErrors(errors)} onClick={save}>
          Zapisz
        </button>
        <button type="button" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  )
}
