import { useState } from 'react'
import type { DiscoveredCalendar } from '../google/calendarList'
import { describeFailure } from '../shared/userFacingError'
import { applyDiscovery, EMPTY_GOOGLE_DRAFT, googleDraftError, isGoogleDraftEmpty, type GoogleDraft } from './googleDraft'

interface GoogleSettingsEditorProps {
  draft: GoogleDraft
  check: (credentials: { clientId: string; clientSecret: string; refreshToken: string }) => Promise<DiscoveredCalendar[]>
  onChange: (draft: GoogleDraft) => void
}

type Status = { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; count: number } | { kind: 'error'; message: string }

export function GoogleSettingsEditor({ draft, check, onChange }: GoogleSettingsEditorProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const incomplete = googleDraftError(draft)

  const verify = async () => {
    setStatus({ kind: 'checking' })
    try {
      const discovered = await check({ clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim(), refreshToken: draft.refreshToken.trim() })
      onChange(applyDiscovery(draft, discovered))
      setStatus({ kind: 'ok', count: discovered.length })
    } catch (error) {
      console.error('Google connection check failed', error)
      setStatus({ kind: 'error', message: describeFailure(error, 'Nie udało się połączyć z Google.') })
    }
  }

  const toggleRead = (id: string) =>
    onChange({ ...draft, readIds: draft.readIds.includes(id) ? draft.readIds.filter((readId) => readId !== id) : [...draft.readIds, id] })

  const disconnect = () => {
    setStatus({ kind: 'idle' })
    onChange(EMPTY_GOOGLE_DRAFT)
  }

  return (
    <section className="settings-section" aria-labelledby="google-heading">
      <h3 id="google-heading">Google Calendar</h3>
      <p className="hint">Bez połączenia wydarzenia zapisują się tylko na tym tablecie. Instrukcja jest w README (sekcja Google Calendar integration).</p>
      <div className="location-fields">
        <label>
          Identyfikator klienta
          <input value={draft.clientId} onChange={(event) => onChange({ ...draft, clientId: event.target.value })} />
        </label>
        <label>
          Sekret klienta
          <input value={draft.clientSecret} onChange={(event) => onChange({ ...draft, clientSecret: event.target.value })} />
        </label>
        <label>
          Token odświeżania
          <input value={draft.refreshToken} onChange={(event) => onChange({ ...draft, refreshToken: event.target.value })} />
        </label>
      </div>
      <div className="location-fields">
        <button type="button" disabled={incomplete !== null || isGoogleDraftEmpty(draft) || status.kind === 'checking'} onClick={verify}>
          Sprawdź połączenie
        </button>
        <button type="button" disabled={isGoogleDraftEmpty(draft)} onClick={disconnect}>
          Odłącz Google
        </button>
      </div>
      {incomplete !== null && (
        <p className="field-error" role="alert">
          {incomplete}
        </p>
      )}
      {status.kind === 'checking' && <p className="hint">Łączenie z Google…</p>}
      {status.kind === 'ok' && <p className="hint">{`Połączono. Liczba kalendarzy: ${status.count}.`}</p>}
      {status.kind === 'error' && (
        <p className="field-error" role="alert">
          {status.message}
        </p>
      )}
      {draft.known.length > 0 && (
        <ul className="calendar-choices">
          {draft.known.map((calendar) => (
            <li key={calendar.id}>
              <label>
                <input type="checkbox" checked={draft.readIds.includes(calendar.id)} onChange={() => toggleRead(calendar.id)} />
                {`Pokaż: ${calendar.name}`}
              </label>
              <label>
                <input
                  type="radio"
                  name="write-calendar"
                  disabled={!calendar.canWrite}
                  checked={draft.writeId === calendar.id}
                  onChange={() => onChange({ ...draft, writeId: calendar.id })}
                />
                {calendar.canWrite ? 'Zapisuj tutaj' : 'Tylko do odczytu'}
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
