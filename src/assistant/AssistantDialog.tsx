import type { CalendarPort } from '../calendar/types'
import type { FamilyMember } from '../family/familyMember'
import { MicIcon } from '../shell/icons'
import type { AssistantPort } from './assistant.port'
import { useAssistant } from './useAssistant'
import type { VoiceRecorder } from './voiceRecorder'
import './assistant.css'

interface AssistantDialogProps {
  assistant: AssistantPort | null
  recorder: VoiceRecorder
  calendar: CalendarPort
  members: readonly FamilyMember[]
  onChanged: () => void
  onClose: () => void
}

const formatDay = (date: Date) => date.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })

export function AssistantDialog({ assistant, recorder, calendar, members, onChanged, onClose }: AssistantDialogProps) {
  const { state, listen, stopListening, confirmDelete, declineDelete } = useAssistant({ assistant, recorder, calendar, members, onChanged })
  const pendingDelete = state.phase === 'answer' ? state.pendingDeletes[0] : undefined

  return (
    <div className="assistant-backdrop">
      <div className="assistant-dialog" role="dialog" aria-modal="true" aria-labelledby="assistant-heading">
        <h2 id="assistant-heading">Asystent</h2>

        {state.phase === 'unconfigured' && <p>Asystent potrzebuje klucza API Gemini. Dodaj go w ustawieniach.</p>}

        {state.phase === 'listening' && (
          <>
            <div className="assistant-mic is-listening">
              <MicIcon />
            </div>
            <p role="status">Słucham… Powiedz polecenie.</p>
            <button type="button" onClick={stopListening}>
              Gotowe
            </button>
          </>
        )}

        {state.phase === 'thinking' && <p role="status">Myślę…</p>}

        {state.phase === 'answer' && (
          <>
            {state.text !== '' && <p className="assistant-answer">{state.text}</p>}
            {state.text === '' && state.actions.length === 0 && pendingDelete === undefined && <p className="assistant-answer">Gotowe.</p>}
            {state.actions.length > 0 && (
              <ul className="assistant-actions">
                {state.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            )}
            {pendingDelete !== undefined && (
              <div className="assistant-confirm" role="alert">
                <p>{`Usunąć wydarzenie „${pendingDelete.title}” (${formatDay(pendingDelete.start)})?`}</p>
                <button type="button" onClick={confirmDelete}>
                  Usuń
                </button>
                <button type="button" onClick={declineDelete}>
                  Nie usuwaj
                </button>
              </div>
            )}
          </>
        )}

        {state.phase === 'error' && (
          <p className="field-error" role="alert">
            {state.message}
          </p>
        )}

        <div className="assistant-actions-row">
          {(state.phase === 'answer' || state.phase === 'error') && (
            <button type="button" onClick={listen}>
              Powiedz polecenie
            </button>
          )}
          <button type="button" onClick={onClose}>
            Zamknij
          </button>
        </div>
      </div>
    </div>
  )
}
