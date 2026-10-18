import { useState } from 'react'
import { familyMembersSchema } from '../family/familyMember'
import { hasErrors, memberErrors, type DraftMember } from '../family/memberErrors'
import type { DiscoveredCalendar } from '../google/calendarList'
import type { GeocodingPort, GeoLocation } from '../weather/types'
import { FamilyMembersEditor } from './FamilyMembersEditor'
import { GoogleSettingsEditor } from './GoogleSettingsEditor'
import { draftFromSettings, googleDraftError, googleSettingsFromDraft } from './googleDraft'
import { PinCreate } from './PinCreate'
import type { Settings } from './settings'
import { WeatherLocationEditor } from './WeatherLocationEditor'

interface SettingsFormProps {
  settings: Settings
  geocoder: GeocodingPort
  checkGoogle: (credentials: { clientId: string; clientSecret: string; refreshToken: string }) => Promise<DiscoveredCalendar[]>
  onChange: (settings: Settings) => void
  onClose: () => void
}

export function SettingsForm({ settings, geocoder, checkGoogle, onChange, onClose }: SettingsFormProps) {
  const [members, setMembers] = useState<DraftMember[]>(() => [...settings.familyMembers])
  const [location, setLocation] = useState<GeoLocation | null>(settings.weather.location)
  const [google, setGoogle] = useState(() => draftFromSettings(settings))
  const [isChangingPin, setIsChangingPin] = useState(false)
  const errors = memberErrors(members)

  const save = () => {
    onChange({ ...settings, familyMembers: familyMembersSchema.parse(members), weather: { location }, ...googleSettingsFromDraft(google) })
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
      <GoogleSettingsEditor draft={google} check={checkGoogle} onChange={setGoogle} />
      <section className="settings-section">
        <h3>Zabezpieczenie</h3>
        <button type="button" onClick={() => setIsChangingPin(true)}>
          Zmień PIN
        </button>
      </section>
      <div className="settings-actions">
        <button type="button" disabled={hasErrors(errors) || googleDraftError(google) !== null} onClick={save}>
          Zapisz
        </button>
        <button type="button" onClick={onClose}>
          Anuluj
        </button>
      </div>
    </div>
  )
}
