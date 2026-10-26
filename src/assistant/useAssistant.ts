import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { SpecialTagContext } from '../calendar/specialTag'
import type { CalendarEvent, CalendarPort } from '../calendar/types'
import type { FamilyMember } from '../family/familyMember'
import { describeFailure } from '../shared/userFacingError'
import type { AssistantPort } from './assistant.port'
import { runAssistant } from './runAssistant'
import { createToolExecutor, type ToolExecutor } from './toolExecutor'
import type { Recording, VoiceRecorder } from './voiceRecorder'

export type AssistantState =
  | { phase: 'unconfigured' }
  | { phase: 'listening' }
  | { phase: 'thinking' }
  | { phase: 'answer'; text: string; actions: string[]; pendingDeletes: CalendarEvent[]; executor: ToolExecutor }
  | { phase: 'error'; message: string }

interface UseAssistantOptions {
  /** Null while no Gemini key is configured. */
  assistant: AssistantPort | null
  recorder: VoiceRecorder
  calendar: CalendarPort
  members: readonly FamilyMember[]
  /** Called after the assistant changed the calendar, so the view reloads. */
  onChanged: () => void
}

/** The recording in progress and the number of the latest run: an older run that is still awaiting something must not touch the screen. */
interface RunTracker {
  recording: Recording | null
  id: number
}

type RoundOptions = UseAssistantOptions & { specialTag: string }

/** One round: record a command, send it, run what the model asks for, and report each step through `show`. */
async function converse(
  { assistant, recorder, calendar, members, specialTag, onChanged }: RoundOptions & { assistant: AssistantPort },
  tracker: RunTracker,
  show: (state: AssistantState) => void,
): Promise<void> {
  const id = ++tracker.id
  const isCurrent = () => tracker.id === id
  let executor: ToolExecutor | null = null
  try {
    const recording = await recorder.start()
    if (!isCurrent()) {
      recording.cancel()
      return
    }
    tracker.recording = recording
    const audio = await recording.result
    if (!isCurrent()) return
    tracker.recording = null
    if (audio === null) {
      show({ phase: 'error', message: 'Nie usłyszałem polecenia. Spróbuj jeszcze raz.' })
      return
    }
    show({ phase: 'thinking' })
    executor = createToolExecutor({ port: calendar, members, specialTag })
    const run = await runAssistant(assistant.startSession({ now: new Date(), members }), executor, audio)
    if (!isCurrent()) return
    if (run.actions.length > 0) onChanged()
    show({ phase: 'answer', text: run.text, actions: run.actions, pendingDeletes: run.pendingDeletes, executor })
  } catch (error) {
    if (!isCurrent()) return
    console.error('The assistant failed', error)
    // Some changes may have been made before the failure.
    if (executor !== null) onChanged()
    show({ phase: 'error', message: describeFailure(error, 'Asystent nie zadziałał. Spróbuj ponownie.') })
  }
}

/** Listens as soon as it is mounted; closing (unmounting) releases the microphone and drops any answer still on its way. */
export function useAssistant(options: UseAssistantOptions) {
  const [state, setState] = useState<AssistantState>(options.assistant === null ? { phase: 'unconfigured' } : { phase: 'listening' })
  const specialTag = useContext(SpecialTagContext)
  const latest = useRef<RoundOptions>({ ...options, specialTag })
  const tracker = useRef<RunTracker>({ recording: null, id: 0 })

  useEffect(() => {
    latest.current = { ...options, specialTag }
  })

  const start = useCallback(() => {
    const { assistant, ...rest } = latest.current
    if (assistant !== null) void converse({ assistant, ...rest }, tracker.current, setState)
  }, [])

  useEffect(() => {
    const current = tracker.current
    start()
    return () => {
      current.id++
      current.recording?.cancel()
      current.recording = null
    }
  }, [start])

  const listenAgain = useCallback(() => {
    setState({ phase: 'listening' })
    start()
  }, [start])

  /** Ends the recording now instead of waiting for silence. */
  const stopListening = useCallback(() => tracker.current.recording?.stop(), [])

  const resolveDelete = async (isConfirmed: boolean) => {
    if (state.phase !== 'answer') return
    const [event, ...rest] = state.pendingDeletes
    try {
      if (isConfirmed) {
        await state.executor.deleteConfirmed(event)
        latest.current.onChanged()
      }
    } catch (error) {
      console.error('Could not delete the event', error)
      setState({ phase: 'error', message: describeFailure(error, 'Nie udało się usunąć wydarzenia.') })
      return
    }
    const actions = isConfirmed ? [...state.actions, `Usunięto wydarzenie „${event.title}”.`] : state.actions
    setState({ ...state, actions, pendingDeletes: rest })
  }

  return {
    state,
    listen: listenAgain,
    stopListening,
    confirmDelete: () => resolveDelete(true),
    declineDelete: () => resolveDelete(false),
  }
}
