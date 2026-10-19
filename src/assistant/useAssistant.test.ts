import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent, CalendarPort } from '../calendar/types'
import { UserFacingError } from '../shared/userFacingError'
import type { AssistantPort, AssistantSession, ModelTurn, RecordedAudio } from './assistant.port'
import { useAssistant } from './useAssistant'
import type { Recording, VoiceRecorder } from './voiceRecorder'

const audio: RecordedAudio = { base64: 'AAAA', mimeType: 'audio/webm' }
const members = [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }]
const dentist: CalendarEvent = { id: 'e1', title: 'Dentysta', allDay: false, start: new Date(2026, 9, 21, 15), end: new Date(2026, 9, 21, 16) }
const swimming: CalendarEvent = { id: 'e2', title: 'Basen', allDay: false, start: new Date(2026, 9, 22, 17), end: new Date(2026, 9, 22, 18) }

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(options: { turns?: ModelTurn[]; events?: CalendarEvent[]; assistant?: null } = {}) {
  const result = deferred<RecordedAudio | null>()
  const recording: Recording = { stop: vi.fn(), cancel: vi.fn(), result: result.promise }
  const recorder: VoiceRecorder = { start: vi.fn(async () => recording) }
  const queue = [...(options.turns ?? [])]
  const session: AssistantSession = { ask: vi.fn(async () => queue.shift()!), answer: vi.fn(async () => queue.shift()!) }
  const assistant: AssistantPort = { startSession: vi.fn(() => session) }
  const calendar: CalendarPort = {
    listEvents: vi.fn(async () => options.events ?? []),
    createEvent: vi.fn(async (input) => ({ ...input, id: 'new' })),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(async () => undefined),
  }
  const onChanged = vi.fn()
  const hook = renderHook(() => useAssistant({ assistant: options.assistant === null ? null : assistant, recorder, calendar, members, onChanged }))
  return { ...hook, result: hook.result, speak: result, recording, recorder, session, assistant, calendar, onChanged }
}

const say = (text: string): ModelTurn => ({ calls: [], text })
const call = (name: string, args: unknown): ModelTurn => ({ calls: [{ id: 'c', name, args }], text: '' })

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))
afterEach(() => vi.restoreAllMocks())

describe('useAssistant', () => {
  it('is unconfigured, and does not touch the microphone, without a Gemini key', () => {
    const { result, recorder } = setup({ assistant: null })
    expect(result.current.state).toEqual({ phase: 'unconfigured' })
    expect(recorder.start).not.toHaveBeenCalled()
  })

  it('starts listening as soon as it is mounted', async () => {
    const { result, recorder } = setup()
    expect(result.current.state).toEqual({ phase: 'listening' })
    await waitFor(() => expect(recorder.start).toHaveBeenCalledTimes(1))
  })

  it('sends what was said and shows the answer', async () => {
    const { result, speak, session, assistant, onChanged } = setup({ turns: [say('Nic nie trzeba robić.')] })
    await waitFor(() => expect(result.current.state.phase).toBe('listening'))
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    expect(session.ask).toHaveBeenCalledWith(audio)
    expect(assistant.startSession).toHaveBeenCalledWith({ now: expect.any(Date), members })
    expect(result.current.state).toMatchObject({ text: 'Nic nie trzeba robić.', actions: [], pendingDeletes: [] })
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('shows a thinking state while the model works', async () => {
    const { result, speak, session } = setup({ turns: [say('x')] })
    const gate = deferred<ModelTurn>()
    vi.mocked(session.ask).mockReturnValueOnce(gate.promise)
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('thinking'))
    await act(async () => gate.resolve(say('x')))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
  })

  it('reloads the calendar when the assistant changed it', async () => {
    const { result, speak, calendar, onChanged } = setup({
      turns: [call('create_event', { title: 'Basen', date: '2026-10-23', startTime: '17:00' }), say('Dodałem.')],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    expect(calendar.createEvent).toHaveBeenCalledTimes(1)
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(result.current.state).toMatchObject({ actions: ['Dodano wydarzenie „Basen” (2026-10-23).'] })
  })

  it('asks the user to confirm a delete and deletes only after confirmation', async () => {
    const { result, speak, calendar, onChanged } = setup({
      events: [dentist, swimming],
      turns: [call('list_events', { from: '2026-10-21', to: '2026-10-22' }), call('delete_event', { eventId: 'e1' }), say('Czy usunąć?')],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    expect(result.current.state).toMatchObject({ pendingDeletes: [dentist] })
    expect(calendar.deleteEvent).not.toHaveBeenCalled()
    await act(async () => result.current.confirmDelete())
    expect(calendar.deleteEvent).toHaveBeenCalledWith(dentist, 'occurrence')
    expect(onChanged).toHaveBeenCalledTimes(1)
    expect(result.current.state).toMatchObject({ pendingDeletes: [], actions: ['Usunięto wydarzenie „Dentysta”.'] })
  })

  it('keeps the event when the user declines', async () => {
    const { result, speak, calendar, onChanged } = setup({
      events: [dentist],
      turns: [call('list_events', { from: '2026-10-21', to: '2026-10-21' }), call('delete_event', { eventId: 'e1' }), say('Czy usunąć?')],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    await act(async () => result.current.declineDelete())
    expect(calendar.deleteEvent).not.toHaveBeenCalled()
    expect(onChanged).not.toHaveBeenCalled()
    expect(result.current.state).toMatchObject({ pendingDeletes: [], actions: [] })
  })

  it('walks through several pending deletes one at a time', async () => {
    const { result, speak } = setup({
      events: [dentist, swimming],
      turns: [
        call('list_events', { from: '2026-10-21', to: '2026-10-22' }),
        { calls: [{ id: 'a', name: 'delete_event', args: { eventId: 'e1' } }, { id: 'b', name: 'delete_event', args: { eventId: 'e2' } }], text: '' },
        say('Czy usunąć oba?'),
      ],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    await act(async () => result.current.confirmDelete())
    expect(result.current.state).toMatchObject({ pendingDeletes: [swimming] })
  })

  it('reports a delete that fails', async () => {
    const { result, speak, calendar } = setup({
      events: [dentist],
      turns: [call('list_events', { from: '2026-10-21', to: '2026-10-21' }), call('delete_event', { eventId: 'e1' }), say('Czy usunąć?')],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    vi.mocked(calendar.deleteEvent).mockRejectedValueOnce(new UserFacingError('Brak połączenia z serwerami Google.'))
    await act(async () => result.current.confirmDelete())
    expect(result.current.state).toEqual({ phase: 'error', message: 'Brak połączenia z serwerami Google.' })
  })

  it('falls back to a generic message when a delete fails for an unknown reason', async () => {
    const { result, speak, calendar } = setup({
      events: [dentist],
      turns: [call('list_events', { from: '2026-10-21', to: '2026-10-21' }), call('delete_event', { eventId: 'e1' }), say('?')],
    })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state.phase).toBe('answer'))
    vi.mocked(calendar.deleteEvent).mockRejectedValueOnce(new Error('boom'))
    await act(async () => result.current.confirmDelete())
    expect(result.current.state).toEqual({ phase: 'error', message: 'Nie udało się usunąć wydarzenia.' })
  })

  it('ignores a delete decision when there is nothing to decide', async () => {
    const { result } = setup()
    await act(async () => result.current.confirmDelete())
    expect(result.current.state).toEqual({ phase: 'listening' })
  })

  it('says when nobody spoke', async () => {
    const { result, speak } = setup()
    await act(async () => speak.resolve(null))
    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error', message: 'Nie usłyszałem polecenia. Spróbuj jeszcze raz.' }))
  })

  it('explains a failure that has a Polish message, and reloads in case something changed', async () => {
    const { result, speak, session, onChanged } = setup()
    vi.mocked(session.ask).mockRejectedValueOnce(new UserFacingError('Brak połączenia z Gemini.'))
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error', message: 'Brak połączenia z Gemini.' }))
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('uses a generic message for any other failure', async () => {
    const { result, speak, session } = setup()
    vi.mocked(session.ask).mockRejectedValueOnce(new Error('boom'))
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error', message: 'Asystent nie zadziałał. Spróbuj ponownie.' }))
  })

  it('does not reload when the microphone could not be started', async () => {
    const { result, recorder, onChanged } = setup()
    vi.mocked(recorder.start).mockRejectedValue(new UserFacingError('Nie udało się włączyć mikrofonu.'))
    await act(async () => result.current.listen())
    await waitFor(() => expect(result.current.state).toEqual({ phase: 'error', message: 'Nie udało się włączyć mikrofonu.' }))
    expect(onChanged).not.toHaveBeenCalled()
  })

  it('listens again on request', async () => {
    const { result, speak, recorder } = setup({ turns: [say('Pierwsza odpowiedź'), say('Druga odpowiedź')] })
    await act(async () => speak.resolve(audio))
    await waitFor(() => expect(result.current.state).toMatchObject({ phase: 'answer', text: 'Pierwsza odpowiedź' }))
    await act(async () => result.current.listen())
    await waitFor(() => expect(result.current.state).toMatchObject({ phase: 'answer', text: 'Druga odpowiedź' }))
    expect(recorder.start).toHaveBeenCalledTimes(2)
  })

  it('stops the recording on request', async () => {
    const { result, recording } = setup()
    await waitFor(() => expect(result.current.state.phase).toBe('listening'))
    await act(async () => undefined)
    act(() => result.current.stopListening())
    expect(recording.stop).toHaveBeenCalledTimes(1)
  })

  it('does nothing when asked to stop without a recording', () => {
    const { result } = setup({ assistant: null })
    expect(() => act(() => result.current.stopListening())).not.toThrow()
  })

  describe('when it is closed', () => {
    it('cancels a recording in progress', async () => {
      const { unmount, recording } = setup()
      await act(async () => undefined)
      unmount()
      expect(recording.cancel).toHaveBeenCalledTimes(1)
    })

    it('cancels a recording that only started after closing', async () => {
      const { unmount, recorder, recording } = setup()
      const gate = deferred<Recording>()
      vi.mocked(recorder.start).mockReturnValueOnce(gate.promise)
      await act(async () => undefined)
      const { result } = renderHook(() => useAssistant({ assistant: { startSession: vi.fn() }, recorder, calendar: {} as CalendarPort, members, onChanged: vi.fn() }))
      unmount()
      await act(async () => gate.resolve(recording))
      expect(result.current.state.phase).toBe('listening')
    })

    it('drops a recording that ends afterwards', async () => {
      const { unmount, speak, session } = setup()
      await act(async () => undefined)
      unmount()
      await act(async () => speak.resolve(audio))
      expect(session.ask).not.toHaveBeenCalled()
    })

    it('drops an answer that arrives afterwards, without reloading the calendar', async () => {
      const { result, unmount, speak, session, onChanged } = setup()
      const gate = deferred<ModelTurn>()
      vi.mocked(session.ask).mockReturnValueOnce(gate.promise)
      await act(async () => speak.resolve(audio))
      await waitFor(() => expect(result.current.state.phase).toBe('thinking'))
      unmount()
      await act(async () => gate.resolve(say('za późno')))
      expect(onChanged).not.toHaveBeenCalled()
    })

    it('drops a failure that arrives afterwards', async () => {
      const { result, unmount, speak, session, onChanged } = setup()
      const gate = deferred<ModelTurn>()
      vi.mocked(session.ask).mockReturnValueOnce(gate.promise)
      await act(async () => speak.resolve(audio))
      await waitFor(() => expect(result.current.state.phase).toBe('thinking'))
      unmount()
      await act(async () => gate.reject(new Error('boom')))
      expect(onChanged).not.toHaveBeenCalled()
      expect(console.error).not.toHaveBeenCalled()
    })
  })
})
