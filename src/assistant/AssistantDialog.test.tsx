import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarEvent, CalendarPort } from '../calendar/types'
import { AssistantDialog } from './AssistantDialog'
import type { AssistantPort, AssistantSession, ModelTurn, RecordedAudio } from './assistant.port'
import type { Recording, VoiceRecorder } from './voiceRecorder'

const audio: RecordedAudio = { base64: 'AAAA', mimeType: 'audio/webm' }
const dentist: CalendarEvent = { id: 'e1', title: 'Dentysta', allDay: false, start: new Date(2026, 9, 21, 15), end: new Date(2026, 9, 21, 16) }

function setup(turns: ModelTurn[] = [], isConfigured = true) {
  let speak!: (audio: RecordedAudio | null) => void
  const result = new Promise<RecordedAudio | null>((resolve) => {
    speak = resolve
  })
  const recording: Recording = { stop: vi.fn(), cancel: vi.fn(), result }
  const recorder: VoiceRecorder = { start: vi.fn(async () => recording) }
  const queue = [...turns]
  const session: AssistantSession = { ask: vi.fn(async () => queue.shift()!), answer: vi.fn(async () => queue.shift()!) }
  const assistant: AssistantPort | null = isConfigured ? { startSession: () => session } : null
  const calendar: CalendarPort = {
    listEvents: vi.fn(async () => [dentist]),
    createEvent: vi.fn(async (input) => ({ ...input, id: 'new' })),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(async () => undefined),
  }
  const onClose = vi.fn()
  const onChanged = vi.fn()
  render(<AssistantDialog assistant={assistant} recorder={recorder} calendar={calendar} members={[]} onChanged={onChanged} onClose={onClose} />)
  return { speak: (value: RecordedAudio | null) => act(async () => speak(value)), recording, calendar, onClose, onChanged }
}

beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined))

describe('AssistantDialog', () => {
  it('is a modal dialog with a heading', () => {
    setup()
    const dialog = screen.getByRole('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByRole('heading', { name: 'Asystent' })).toBeTruthy()
  })

  it('points to the settings when there is no Gemini key', () => {
    setup([], false)
    expect(screen.getByText('Asystent potrzebuje klucza API Gemini. Dodaj go w ustawieniach.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Gotowe' })).toBeNull()
  })

  it('listens at once and can be finished by hand', async () => {
    const { recording } = setup()
    expect(screen.getByRole('status').textContent).toBe('Słucham… Powiedz polecenie.')
    await act(async () => undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Gotowe' }))
    expect(recording.stop).toHaveBeenCalledTimes(1)
  })

  it('shows that it is thinking and then the answer', async () => {
    const { speak } = setup([{ calls: [], text: 'Masz dziś dentystę.' }])
    await speak(audio)
    expect(await screen.findByText('Masz dziś dentystę.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Powiedz polecenie' })).toBeTruthy()
  })

  it('says "Gotowe." when there is nothing to report', async () => {
    const { speak } = setup([{ calls: [], text: '' }])
    await speak(audio)
    expect(await screen.findByText('Gotowe.')).toBeTruthy()
  })

  it('lists what was changed and refreshes the calendar', async () => {
    const { speak, onChanged } = setup([
      { calls: [{ id: 'c', name: 'create_event', args: { title: 'Basen', date: '2026-10-23', startTime: '17:00' } }], text: '' },
      { calls: [], text: 'Dodane.' },
    ])
    await speak(audio)
    expect(await screen.findByText('Dodano wydarzenie „Basen” (2026-10-23).')).toBeTruthy()
    expect(screen.queryByText('Gotowe.')).toBeNull()
    expect(onChanged).toHaveBeenCalledTimes(1)
  })

  it('asks before deleting and deletes after a tap on "Usuń"', async () => {
    const { speak, calendar } = setup([
      { calls: [{ id: 'a', name: 'list_events', args: { from: '2026-10-21', to: '2026-10-21' } }], text: '' },
      { calls: [{ id: 'b', name: 'delete_event', args: { eventId: 'e1' } }], text: '' },
      { calls: [], text: '' },
    ])
    await speak(audio)
    expect(await screen.findByText(/Usunąć wydarzenie „Dentysta”/)).toBeTruthy()
    expect(screen.queryByText('Gotowe.')).toBeNull()
    expect(calendar.deleteEvent).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
    expect(await screen.findByText('Usunięto wydarzenie „Dentysta”.')).toBeTruthy()
    expect(calendar.deleteEvent).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(/Usunąć wydarzenie/)).toBeNull()
  })

  it('keeps the event when "Nie usuwaj" is tapped', async () => {
    const { speak, calendar } = setup([
      { calls: [{ id: 'a', name: 'list_events', args: { from: '2026-10-21', to: '2026-10-21' } }], text: '' },
      { calls: [{ id: 'b', name: 'delete_event', args: { eventId: 'e1' } }], text: '' },
      { calls: [], text: 'Czy usunąć?' },
    ])
    await speak(audio)
    fireEvent.click(await screen.findByRole('button', { name: 'Nie usuwaj' }))
    await waitFor(() => expect(screen.queryByText(/Usunąć wydarzenie/)).toBeNull())
    expect(calendar.deleteEvent).not.toHaveBeenCalled()
  })

  it('shows an error and offers to try again', async () => {
    const { speak } = setup()
    await speak(null)
    expect((await screen.findByRole('alert')).textContent).toBe('Nie usłyszałem polecenia. Spróbuj jeszcze raz.')
    fireEvent.click(screen.getByRole('button', { name: 'Powiedz polecenie' }))
    expect(screen.getByRole('status').textContent).toContain('Słucham')
  })

  it('closes on "Zamknij"', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
