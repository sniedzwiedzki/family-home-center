import { useContext, useEffect, useState, type CSSProperties, type FormEvent, type KeyboardEvent } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { describeFailure } from '../shared/userFacingError'
import { draftToInput, type DraftErrors, type EventDraft } from './eventDraft'
import { SpecialTagContext } from './specialTag'
import { fieldsFromRecurrence, NO_REPEAT, REPEAT_LABELS, WEEKDAYS, type RepeatKind } from './recurrence'
import type { CalendarEvent, CalendarEventInput, RecurrenceScope, SeriesPort } from './types'
import './eventDialog.css'

const SAVE_ERROR = 'Nie udało się zapisać wydarzenia'
const DELETE_ERROR = 'Nie udało się usunąć wydarzenia'
const RULE_ERROR = 'Nie udało się wczytać powtarzania'

/** What a save applies to: one event or occurrence, or the whole series (`keepRule`: its rule is one the app cannot edit). */
export type SaveTarget = { kind: 'occurrence' } | { kind: 'series'; keepRule: boolean }

type RuleState = 'idle' | 'loading' | 'ready' | 'custom'

interface EventDialogProps {
  heading: string
  initial: EventDraft
  members: readonly FamilyMember[]
  /** Present when editing; its other hidden properties survive the save. */
  existing?: CalendarEvent
  /** Present when events can repeat (Google Calendar); without it the dialog has no repeat controls. */
  series?: SeriesPort
  onSave: (input: CalendarEventInput, target: SaveTarget) => Promise<void>
  /** Present when editing; deleting needs a second tap, and for a recurring event a choice of what to delete. */
  onDelete?: (scope: RecurrenceScope) => Promise<void>
  onClose: () => void
}

export function EventDialog({ heading, initial, members, existing, series, onSave, onDelete, onClose }: EventDialogProps) {
  const specialTag = useContext(SpecialTagContext)
  const [draft, setDraft] = useState(initial)
  const [errors, setErrors] = useState<DraftErrors>({})
  const [failure, setFailure] = useState<string | null>(null)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isSeries, setIsSeries] = useState(false)
  const [rule, setRule] = useState<RuleState>('idle')

  const change = (patch: Partial<EventDraft>) => setDraft((current) => ({ ...current, ...patch }))
  const toggleMember = (id: string) =>
    change({ memberIds: draft.memberIds.includes(id) ? draft.memberIds.filter((memberId) => memberId !== id) : [...draft.memberIds, id] })

  const isRecurring = existing?.recurringEventId !== undefined
  const canChooseTarget = isRecurring && series !== undefined
  // An occurrence only repeats as part of its series, so its repeat controls wait for the loaded rule.
  const showRepeat = series !== undefined && (!isRecurring || (isSeries && rule !== 'loading'))

  useEffect(() => {
    if (!isSeries || existing === undefined || series === undefined) return
    let cancelled = false
    series.loadRule(existing).then(
      (loaded) => {
        if (cancelled) return
        if (loaded === 'custom') setRule('custom')
        else {
          setDraft((current) => ({ ...current, ...fieldsFromRecurrence(loaded) }))
          setRule('ready')
        }
      },
      (error: unknown) => {
        if (cancelled) return
        console.error('Could not load the repeat rule', error)
        setFailure(describeFailure(error, RULE_ERROR))
        setIsSeries(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [isSeries, existing, series])

  const chooseTarget = (series: boolean) => {
    setFailure(null)
    setIsSeries(series)
    setRule(series ? 'loading' : 'idle')
    if (!series) change(NO_REPEAT)
  }
  const toggleDay = (day: number) =>
    change({ repeatDays: draft.repeatDays.includes(day) ? draft.repeatDays.filter((chosen) => chosen !== day) : [...draft.repeatDays, day] })

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const result = draftToInput(draft, members, existing)
    if (!result.ok) {
      setErrors(result.errors)
      return
    }
    setErrors({})
    try {
      await onSave(result.input, isSeries ? { kind: 'series', keepRule: rule === 'custom' } : { kind: 'occurrence' })
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

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }

  return (
    <div className="event-dialog-backdrop" role="dialog" aria-modal="true" aria-label={heading} onKeyDown={closeOnEscape}>
      <form className="event-dialog" onSubmit={submit} noValidate>
        <h2>{heading}</h2>
        {isRecurring && !canChooseTarget && <p className="hint">To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.</p>}
        {canChooseTarget && (
          <>
            <div className="scope-switch" role="group" aria-label="Zakres zmian">
              <button type="button" aria-pressed={!isSeries} onClick={() => chooseTarget(false)}>
                To wystąpienie
              </button>
              <button type="button" aria-pressed={isSeries} onClick={() => chooseTarget(true)}>
                Cała seria
              </button>
            </div>
            <p className="hint">
              {isSeries ? 'Zmiany dotyczą całej serii. Data początku serii się nie zmienia.' : 'To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.'}
            </p>
          </>
        )}

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
          <input type="checkbox" checked={draft.special !== null} onChange={(event) => change({ special: event.target.checked ? specialTag : null })} />
          Wydarzenie specjalne ★
        </label>

        <label className="check">
          <input type="checkbox" checked={draft.allDay} onChange={(event) => change({ allDay: event.target.checked })} />
          Cały dzień
        </label>

        {!isSeries && (
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
        )}
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

        {isSeries && rule === 'loading' && <p className="hint">Ładowanie…</p>}
        {isSeries && rule === 'custom' && (
          <p className="hint">Ta seria ma własny wzór powtarzania, którego tu nie zmienisz (zmień go w Google Calendar). Pozostałe zmiany zostaną zapisane.</p>
        )}
        {showRepeat && rule !== 'custom' && (
          <>
            <label>
              Powtarzaj
              <select value={draft.repeat} onChange={(event) => change({ repeat: event.target.value as RepeatKind })}>
                {(Object.keys(REPEAT_LABELS) as RepeatKind[]).map((kind) => (
                  <option key={kind} value={kind}>
                    {REPEAT_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            {draft.repeat === 'weekdays' && (
              <div className="repeat-days" role="group" aria-label="Dni tygodnia">
                {WEEKDAYS.map(({ day, label }) => (
                  <button key={day} type="button" className="weekday-toggle" aria-pressed={draft.repeatDays.includes(day)} onClick={() => toggleDay(day)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
            {draft.repeat !== 'none' && (
              <label>
                Powtarzaj do dnia (opcjonalnie)
                <input type="date" value={draft.repeatUntil} onChange={(event) => change({ repeatUntil: event.target.value })} />
              </label>
            )}
            {errors.repeat !== undefined && (
              <p className="field-error" role="alert">
                {errors.repeat}
              </p>
            )}
          </>
        )}

        {failure !== null && (
          <p className="field-error" role="alert">
            {failure}
          </p>
        )}

        <div className="actions">
          <button type="submit" className="primary" disabled={rule === 'loading'}>
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
