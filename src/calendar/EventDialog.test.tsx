import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { EventDialog } from './EventDialog'
import { newDraft, type EventDraft } from './eventDraft'
import type { CalendarEvent, CalendarEventInput } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#f4a3a8' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#9ec5f0' },
]
const initial = (patch: Partial<EventDraft> = {}): EventDraft => ({ ...newDraft(new Date(2026, 9, 20), ['a']), ...patch })

interface Handlers {
  onSave: Mock<(input: CalendarEventInput) => Promise<void>>
  onDelete?: Mock<() => Promise<void>>
  onClose: Mock<() => void>
}
const show = (draft: EventDraft = initial(), options: { canDelete?: boolean; members?: FamilyMember[]; existing?: CalendarEvent } = {}) => {
  const handlers: Handlers = { onSave: vi.fn(async () => undefined), onClose: vi.fn() }
  if (options.canDelete) handlers.onDelete = vi.fn(async () => undefined)
  render(
    <EventDialog
      heading="Nowe wydarzenie"
      initial={draft}
      members={options.members ?? members}
      existing={options.existing}
      onSave={handlers.onSave}
      onDelete={handlers.onDelete}
      onClose={handlers.onClose}
    />,
  )
  return handlers
}
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Zapisz' }))
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

afterEach(() => vi.restoreAllMocks())

describe('EventDialog', () => {
  it('is a labelled modal with the form values of the draft', () => {
    show(initial({ title: 'Dentysta', description: 'Gabinet' }))
    expect(screen.getByRole('dialog', { name: 'Nowe wydarzenie' }).getAttribute('aria-modal')).toBe('true')
    expect((screen.getByLabelText('Tytuł') as HTMLInputElement).value).toBe('Dentysta')
    expect((screen.getByLabelText('Opis') as HTMLTextAreaElement).value).toBe('Gabinet')
    expect((screen.getByLabelText('Data') as HTMLInputElement).value).toBe('2026-10-20')
    expect((screen.getByLabelText('Od') as HTMLInputElement).value).toBe('09:00')
  })

  it('shows one toggle per person with the preselected ones pressed', () => {
    show()
    expect(screen.getByRole('button', { name: 'Anna' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Jan' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('lets the user add and remove people', async () => {
    const { onSave } = show(initial({ title: 'Kino' }))
    fireEvent.click(screen.getByRole('button', { name: 'Jan' }))
    expect(screen.getByRole('button', { name: 'Jan' }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: 'Anna' }))
    expect(screen.getByRole('button', { name: 'Anna' }).getAttribute('aria-pressed')).toBe('false')
    submit()
    await flush()
    expect(onSave.mock.calls[0][0].extendedProperties).toEqual({ private: { fhcTags: 'jan' } })
  })

  it('points to the settings when there are no people', () => {
    show(initial({ memberIds: [] }), { members: [] })
    expect(screen.getByText('Brak osób. Dodaj je w ustawieniach.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Anna' })).toBeNull()
  })

  it('hides the times for an all-day event', () => {
    show()
    fireEvent.click(screen.getByLabelText('Cały dzień'))
    expect(screen.queryByLabelText('Od')).toBeNull()
    expect(screen.queryByLabelText('Do')).toBeNull()
  })

  it('saves the typed event and passes the built input on', async () => {
    const { onSave } = show()
    type('Tytuł', 'Dentysta')
    type('Opis', 'Gabinet 3')
    type('Od', '10:00')
    type('Do', '11:15')
    submit()
    await flush()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({
      title: 'Dentysta',
      description: 'Gabinet 3',
      allDay: false,
      start: new Date(2026, 9, 20, 10, 0),
      end: new Date(2026, 9, 20, 11, 15),
    })
  })

  it('saves a multi-day all-day event from the end date', async () => {
    const { onSave } = show(initial({ title: 'Wyjazd' }))
    fireEvent.click(screen.getByLabelText('Cały dzień'))
    type('Do dnia', '2026-10-22')
    submit()
    await flush()
    expect(onSave.mock.calls[0][0]).toMatchObject({ allDay: true, start: new Date(2026, 9, 20), end: new Date(2026, 9, 23) })
  })

  it('also saves on Enter in a field (form submit)', async () => {
    const { onSave } = show(initial({ title: 'Obiad' }))
    fireEvent.submit(screen.getByLabelText('Tytuł'))
    await flush()
    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('shows validation errors and does not save', async () => {
    const { onSave } = show(initial({ endTime: '08:00' }))
    submit()
    await flush()
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual(['Podaj tytuł', 'Koniec musi być po początku'])
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows the date error and clears errors on the next successful save', async () => {
    const { onSave } = show(initial({ title: 'X', startDate: '' }))
    submit()
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Podaj datę')
    type('Data', '2026-10-20')
    type('Do dnia', '2026-10-20')
    submit()
    await flush()
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('tells the user when saving fails and stays open', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { onSave, onClose } = show(initial({ title: 'X' }))
    onSave.mockRejectedValueOnce(new Error('quota'))
    submit()
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Nie udało się zapisać wydarzenia')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes with the button and with Escape', () => {
    const { onClose } = show()
    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'a' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('offers no delete button for a new event', () => {
    show()
    expect(screen.queryByRole('button', { name: 'Usuń' })).toBeNull()
  })

  it('needs a second tap to delete', async () => {
    const { onDelete } = show(initial({ title: 'X' }), { canDelete: true })
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
    expect(onDelete).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Na pewno usunąć?' }))
    await flush()
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('tells the user when deleting fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { onDelete } = show(initial({ title: 'X' }), { canDelete: true })
    onDelete!.mockRejectedValueOnce(new Error('quota'))
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
    fireEvent.click(screen.getByRole('button', { name: 'Na pewno usunąć?' }))
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Nie udało się usunąć wydarzenia')
  })

  it('keeps hidden properties of the event being edited when saving', async () => {
    const existing: CalendarEvent = {
      id: 'e',
      title: 'Stare',
      allDay: false,
      start: new Date(2026, 9, 20, 9),
      end: new Date(2026, 9, 20, 10),
      extendedProperties: { private: { source: 'google' } },
    }
    const { onSave } = show(initial({ title: 'Stare', memberIds: [] }), { existing })
    submit()
    await flush()
    expect(onSave.mock.calls[0][0].extendedProperties).toEqual({ private: { source: 'google' } })
  })
})
