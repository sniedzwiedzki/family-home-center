import { useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { describeFailure } from '../shared/userFacingError'
import { draftToInput, type DraftErrors, type EventDraft } from './eventDraft'
import type { CalendarEvent, CalendarEventInput, RecurrenceScope } from './types'
import './eventDialog.css'

const SAVE_ERROR = 'Nie udało się zapisać wydarzenia'
const DELETE_ERROR = 'Nie udało się usunąć wydarzenia'

interface EventDialogProps {
  heading: string
  initial: EventDraft
  members: readonly FamilyMember[]
  /** Present when editing; its other hidden properties survive the save. */
  existing?: CalendarEvent
  onSave: (input: CalendarEventInput) => Promise<void>
  /** Present when editing; deleting needs a second tap, and for a recurring event a choice of what to delete. */
  onDelete?: (scope: RecurrenceScope) => Promise<void>
  onClose: () => void
}

export function EventDialog({ heading, initial, members, existing, onSave, onDelete, onClose }: EventDialogProps) {
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  const change = (patch: Partial<EventDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const toggleMember = (id: string) =>
    change({ memberIds: draft.memberIds.includes(id) ? draft.memberIds.filter((memberId) => memberId !== id) : [...draft.memberIds, id] })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = draftToInput(draft, members, existing)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    try {
      await onSave(result.input)
    } catch (error) {
      console.error('Could not save the event', error)
      setFailure(describeFailure(error, SAVE_ERROR))
    }
  }

  const remove = async (scope: RecurrenceScope) => {
    try {
      await onDelete!(scope)
    } catch (error) {
      console.error('Could not delete the event', error)
      setFailure(describeFailure(error, DELETE_ERROR))
    }
  }

  const isRecurring = existing?.recurringEventId !== undefined

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div className="event-dialog-backdrop" role="dialog" aria-modal="true" aria-label={heading} onKeyDown={closeOnEscape}>
      <form className="event-dialog" onSubmit={submit} noValidate>
        <h2>{heading}</h2>
        {isRecurring && <p className="hint">To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.</p>}

        <label>
          Tytuł
          <input value={draft.title} onChange={(event) => change({ title: event.target.value })} />
        </label>
        {errors.title !== undefined && (
          <p className="field-error" role="alert">
            {errors.title}
          </p>
        )}

        <label>
          Opis
          <textarea rows={6} value={draft.description} onChange={(event) => change({ description: event.target.value })} />
        </label>

        <fieldset className="people">
          <legend>Osoby</legend>
          {members.length === 0 ? (
            <p className="hint">Brak osób. Dodaj je w ustawieniach.</p>
          ) : (
            members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="person-toggle"
                aria-pressed={draft.memberIds.includes(member.id)}
                style={{ '--person-color': member.color } as CSSProperties}
                onClick={() => toggleMember(member.id)}
              >
                {member.name}
              </button>
            ))
          )}
        </fieldset>

        <label className="check">
          <input type="checkbox" checked={draft.allDay} onChange={(event) => change({ allDay: event.target.checked })} />
          Cały dzień
        </label>

        <div className="row">
          <label>
            Data
            <input type="date" value={draft.startDate} onChange={(event) => change({ startDate: event.target.value })} />
          </label>
          <label>
            Do dnia
            <input type="date" value={draft.endDate} onChange={(event) => change({ endDate: event.target.value })} />
          </label>
        </div>
        {errors.date !== undefined && (
          <p className="field-error" role="alert">
            {errors.date}
          </p>
        )}

        {!draft.allDay && (
          <div className="row">
            <label>
              Od
              <input type="time" value={draft.startTime} onChange={(event) => change({ startTime: event.target.value })} />
            </label>
            <label>
              Do
              <input type="time" value={draft.endTime} onChange={(event) => change({ endTime: event.target.value })} />
            </label>
          </div>
        )}
        {errors.time !== undefined && (
          <p className="field-error" role="alert">
            {errors.time}
          </p>
        )}

        {failure !== null && (
          <p className="field-error" role="alert">
            {failure}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="primary">
            Zapisz
          </button>
          <button type="button" onClick={onClose}>
            Anuluj
          </button>
          {onDelete !== undefined && !isConfirmingDelete && (
            <button type="button" className="danger" onClick={() => setIsConfirmingDelete(true)}>
              Usuń
            </button>
          )}
          {onDelete !== undefined && isConfirmingDelete && isRecurring && (
            <>
              <button type="button" className="danger" onClick={() => remove('occurrence')}>
                Usuń to wystąpienie
              </button>
              <button type="button" className="danger" onClick={() => remove('series')}>
                Usuń całą serię
              </button>
            </>
          )}
          {onDelete !== undefined && isConfirmingDelete && !isRecurring && (
            <button type="button" className="danger" onClick={() => remove('occurrence')}>
              Na pewno usunąć?
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
