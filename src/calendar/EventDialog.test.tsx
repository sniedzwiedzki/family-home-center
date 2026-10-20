import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { FamilyMember } from '../family/familyMember'
import { UserFacingError } from '../shared/userFacingError'
import { EventDialog, type SaveTarget } from './EventDialog'
import { newDraft, type EventDraft } from './eventDraft'
import type { CalendarEvent, CalendarEventInput, RecurrenceScope, SeriesPort, SeriesRule } from './types'

const members: FamilyMember[] = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#f4a3a8' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#9ec5f0' },
]
const initial = (patch: Partial<EventDraft> = {}): EventDraft => ({ ...newDraft(new Date(2026, 9, 20), ['a']), ...patch })

interface Handlers {
  onSave: Mock<(input: CalendarEventInput, target: SaveTarget) => Promise<void>>
  onDelete?: Mock<(scope: RecurrenceScope) => Promise<void>>
  onClose: Mock<() => void>
}
const show = (draft: EventDraft = initial(), options: { canDelete?: boolean; members?: FamilyMember[]; existing?: CalendarEvent; series?: SeriesPort } = {}) => {
  const handlers: Handlers = { onSave: vi.fn(async () => undefined), onClose: vi.fn() }
  if (options.canDelete) handlers.onDelete = vi.fn(async () => undefined)
  render(
    <EventDialog
      heading="Nowe wydarzenie"
      initial={draft}
      members={options.members ?? members}
      existing={options.existing}
      series={options.series}
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
    expect(onDelete).toHaveBeenCalledWith('occurrence')
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

  it('shows the Polish reason when saving fails for a known cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { onSave } = show(initial({ title: 'X' }))
    onSave.mockRejectedValueOnce(new UserFacingError('Wybierz kalendarz do zapisu w ustawieniach.'))
    submit()
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Wybierz kalendarz do zapisu w ustawieniach.')
  })

  it('shows the Polish reason when deleting fails for a known cause', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { onDelete } = show(initial({ title: 'X' }), { canDelete: true })
    onDelete!.mockRejectedValueOnce(new UserFacingError('Brak uprawnień (403).'))
    fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
    fireEvent.click(screen.getByRole('button', { name: 'Na pewno usunąć?' }))
    await flush()
    expect(screen.getByRole('alert').textContent).toBe('Brak uprawnień (403).')
  })

  describe('a recurring event', () => {
    const recurring: CalendarEvent = {
      id: 'c|e_20261020',
      recurringEventId: 'c|e',
      title: 'Trening',
      allDay: false,
      start: new Date(2026, 9, 20, 17),
      end: new Date(2026, 9, 20, 18),
    }

    it('explains that edits apply to this occurrence only', () => {
      show(initial({ title: 'Trening' }), { canDelete: true, existing: recurring })
      expect(screen.getByText('To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.')).toBeTruthy()
    })

    it('does not mention it for a normal event', () => {
      show(initial({ title: 'Trening' }), { canDelete: true })
      expect(screen.queryByText(/cykliczne/)).toBeNull()
    })

    it('offers to delete this occurrence or the whole series after the first tap', async () => {
      const { onDelete } = show(initial({ title: 'Trening' }), { canDelete: true, existing: recurring })
      expect(screen.queryByRole('button', { name: 'Usuń całą serię' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Usuń' }))
      expect(screen.queryByRole('button', { name: 'Na pewno usunąć?' })).toBeNull()
      fireEvent.click(screen.getByRole('button', { name: 'Usuń to wystąpienie' }))
      await flush()
      expect(onDelete).toHaveBeenLastCalledWith('occurrence')
      fireEvent.click(screen.getByRole('button', { name: 'Usuń całą serię' }))
      await flush()
      expect(onDelete).toHaveBeenLastCalledWith('series')
    })
  })
})

describe('repeating', () => {
  const seriesOf = (rule: SeriesRule | Error = { frequency: 'weekly', weekdays: [], until: null }): SeriesPort => ({
    loadRule: vi.fn(async () => {
      if (rule instanceof Error) throw rule
      return rule
    }),
    update: vi.fn(),
  })
  const select = () => screen.getByLabelText('Powtarzaj') as HTMLSelectElement
  const choose = (kind: string) => fireEvent.change(select(), { target: { value: kind } })
  const occurrence: CalendarEvent = { id: 'c|s_20261020', recurringEventId: 'c|s', title: 'Basen', allDay: false, start: new Date(2026, 9, 20, 9), end: new Date(2026, 9, 20, 10) }
  const openOccurrence = (series: SeriesPort) => show(initial({ title: 'Basen' }), { existing: occurrence, series })

  describe('of a new event', () => {
    it('has no repeat controls without Google', () => {
      show()
      expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
    })

    it('offers the four kinds, starting with no repeating, and no end date until one is chosen', () => {
      show(initial(), { series: seriesOf() })
      expect([...select().options].map((option) => option.textContent)).toEqual([
        'Nie powtarzaj',
        'Co tydzień',
        'Co tydzień w wybrane dni',
        'Co miesiąc tego dnia',
        'Co rok tego dnia',
      ])
      expect(select().value).toBe('none')
      expect(screen.queryByLabelText('Powtarzaj do dnia (opcjonalnie)')).toBeNull()
    })

    it('saves a weekly event as an occurrence-level save with the rule', async () => {
      const { onSave } = show(initial({ title: 'Basen' }), { series: seriesOf() })
      choose('weekly')
      submit()
      await flush()
      expect(onSave.mock.calls[0][0].recurrence).toEqual({ frequency: 'weekly', weekdays: [], until: null })
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'occurrence' })
    })

    it('shows weekday toggles for "Co tydzień w wybrane dni" and saves the chosen days and the end', async () => {
      const { onSave } = show(initial({ title: 'Basen' }), { series: seriesOf() })
      choose('weekdays')
      expect(screen.getAllByRole('button', { name: /^(Pn|Wt|Śr|Cz|Pt|So|Nd)$/ })).toHaveLength(7)
      fireEvent.click(screen.getByRole('button', { name: 'Śr' }))
      fireEvent.click(screen.getByRole('button', { name: 'Pn' }))
      fireEvent.click(screen.getByRole('button', { name: 'Śr' }))
      expect(screen.getByRole('button', { name: 'Pn' }).getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByRole('button', { name: 'Śr' }).getAttribute('aria-pressed')).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: 'Pt' }))
      type('Powtarzaj do dnia (opcjonalnie)', '2026-12-31')
      submit()
      await flush()
      expect(onSave.mock.calls[0][0].recurrence).toEqual({ frequency: 'weekly', weekdays: [1, 5], until: '2026-12-31' })
    })

    it('hides the weekday toggles for the other kinds', () => {
      show(initial(), { series: seriesOf() })
      choose('monthly')
      expect(screen.queryByRole('group', { name: 'Dni tygodnia' })).toBeNull()
      expect(screen.getByLabelText('Powtarzaj do dnia (opcjonalnie)')).toBeTruthy()
    })

    it('does not save without a weekday, nor with an end before the start, and says why', async () => {
      const { onSave } = show(initial({ title: 'Basen' }), { series: seriesOf() })
      choose('weekdays')
      submit()
      await flush()
      expect(screen.getByRole('alert').textContent).toBe('Wybierz dni tygodnia')
      fireEvent.click(screen.getByRole('button', { name: 'Pn' }))
      type('Powtarzaj do dnia (opcjonalnie)', '2026-10-01')
      submit()
      await flush()
      expect(screen.getByRole('alert').textContent).toBe('Koniec powtarzania nie może być przed początkiem')
      expect(onSave).not.toHaveBeenCalled()
    })
  })

  describe('of an event that is not part of a series', () => {
    it('offers repeating and saves the rule', async () => {
      const single: CalendarEvent = { ...occurrence, id: 'c|plain', recurringEventId: undefined }
      const { onSave } = show(initial({ title: 'Basen' }), { existing: single, series: seriesOf() })
      expect(screen.queryByRole('group', { name: 'Zakres zmian' })).toBeNull()
      choose('yearly')
      submit()
      await flush()
      expect(onSave.mock.calls[0][0].recurrence).toEqual({ frequency: 'yearly', weekdays: [], until: null })
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'occurrence' })
    })
  })

  describe('of an occurrence of a series', () => {
    it('changes only the occurrence by default, without the repeat controls', async () => {
      const series = seriesOf()
      const { onSave } = openOccurrence(series)
      expect(screen.getByRole('button', { name: 'To wystąpienie' }).getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByText('To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.')).toBeTruthy()
      expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
      submit()
      await flush()
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'occurrence' })
      expect('recurrence' in onSave.mock.calls[0][0]).toBe(false)
      expect(series.loadRule).not.toHaveBeenCalled()
    })

    it('loads the rule of the series when "Cała seria" is chosen, then shows it and hides the dates', async () => {
      const series = seriesOf({ frequency: 'weekly', weekdays: [1, 3], until: '2026-12-31' })
      openOccurrence(series)
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      expect(screen.getByText('Ładowanie…')).toBeTruthy()
      expect((screen.getByRole('button', { name: 'Zapisz' }) as HTMLButtonElement).disabled).toBe(true)
      expect(await screen.findByLabelText('Powtarzaj')).toBeTruthy()
      expect(series.loadRule).toHaveBeenCalledWith(occurrence)
      expect(select().value).toBe('weekdays')
      expect(screen.getByRole('button', { name: 'Pn' }).getAttribute('aria-pressed')).toBe('true')
      expect((screen.getByLabelText('Powtarzaj do dnia (opcjonalnie)') as HTMLInputElement).value).toBe('2026-12-31')
      expect(screen.getByText('Zmiany dotyczą całej serii. Data początku serii się nie zmienia.')).toBeTruthy()
      expect(screen.queryByLabelText('Data')).toBeNull()
      expect((screen.getByRole('button', { name: 'Zapisz' }) as HTMLButtonElement).disabled).toBe(false)
    })

    it('saves the series with the edited rule', async () => {
      const { onSave } = openOccurrence(seriesOf())
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      await screen.findByLabelText('Powtarzaj')
      choose('monthly')
      submit()
      await flush()
      expect(onSave.mock.calls[0][0].recurrence).toEqual({ frequency: 'monthly', weekdays: [], until: null })
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'series', keepRule: false })
    })

    it('saves the series without a rule when repeating is switched off', async () => {
      const { onSave } = openOccurrence(seriesOf())
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      await screen.findByLabelText('Powtarzaj')
      choose('none')
      submit()
      await flush()
      expect('recurrence' in onSave.mock.calls[0][0]).toBe(false)
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'series', keepRule: false })
    })

    it('says so and keeps the rule when it is one the app cannot edit', async () => {
      const { onSave } = openOccurrence(seriesOf('custom'))
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      expect(await screen.findByText(/własny wzór powtarzania/)).toBeTruthy()
      expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
      submit()
      await flush()
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'series', keepRule: true })
    })

    it('goes back to the occurrence and forgets the loaded rule', async () => {
      const { onSave } = openOccurrence(seriesOf())
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      await screen.findByLabelText('Powtarzaj')
      fireEvent.click(screen.getByRole('button', { name: 'To wystąpienie' }))
      expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
      expect(screen.getByLabelText('Data')).toBeTruthy()
      submit()
      await flush()
      expect(onSave.mock.calls[0][1]).toEqual({ kind: 'occurrence' })
      expect('recurrence' in onSave.mock.calls[0][0]).toBe(false)
    })

    it('stays on the occurrence and says so when the rule cannot be loaded', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      openOccurrence(seriesOf(new UserFacingError('Brak połączenia z serwerami Google.')))
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      expect((await screen.findByRole('alert')).textContent).toBe('Brak połączenia z serwerami Google.')
      expect(screen.getByRole('button', { name: 'To wystąpienie' }).getAttribute('aria-pressed')).toBe('true')
    })

    it('uses a generic message when loading the rule fails for an unknown reason', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      openOccurrence(seriesOf(new Error('boom')))
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      expect((await screen.findByRole('alert')).textContent).toBe('Nie udało się wczytać powtarzania')
    })

    it('drops a rule that arrives after the user went back to the occurrence', async () => {
      let release!: (rule: SeriesRule) => void
      const series: SeriesPort = { loadRule: vi.fn(() => new Promise<SeriesRule>((resolve) => (release = resolve))), update: vi.fn() }
      openOccurrence(series)
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      fireEvent.click(screen.getByRole('button', { name: 'To wystąpienie' }))
      release({ frequency: 'monthly', weekdays: [], until: null })
      await flush()
      expect(screen.queryByLabelText('Powtarzaj')).toBeNull()
    })

    it('drops a failure that arrives after the user went back to the occurrence', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
      let fail!: (error: Error) => void
      const series: SeriesPort = { loadRule: vi.fn(() => new Promise<SeriesRule>((_resolve, reject) => (fail = reject))), update: vi.fn() }
      openOccurrence(series)
      fireEvent.click(screen.getByRole('button', { name: 'Cała seria' }))
      fireEvent.click(screen.getByRole('button', { name: 'To wystąpienie' }))
      fail(new Error('late'))
      await flush()
      expect(screen.queryByRole('alert')).toBeNull()
      expect(console.error).not.toHaveBeenCalled()
    })
  })

  it('keeps the old hint for an occurrence when events cannot be repeated', () => {
    show(initial(), { existing: occurrence })
    expect(screen.queryByRole('group', { name: 'Zakres zmian' })).toBeNull()
    expect(screen.getByText('To wydarzenie cykliczne. Zmiany dotyczą tylko tego wystąpienia.')).toBeTruthy()
  })
})

