import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { DiscoveredCalendar } from '../google/calendarList'
import { UserFacingError } from '../shared/userFacingError'
import { GoogleSettingsEditor } from './GoogleSettingsEditor'
import { EMPTY_GOOGLE_DRAFT, type GoogleDraft } from './googleDraft'

const filled: GoogleDraft = { ...EMPTY_GOOGLE_DRAFT, clientId: 'id', clientSecret: 'secret', refreshToken: 'token' }
const discovered: DiscoveredCalendar[] = [
  { id: 'me@x', name: 'Ja', canWrite: true, selected: true, primary: true },
  { id: 'holidays@x', name: 'Święta', canWrite: false, selected: false, primary: false },
]

type Check = Mock<(credentials: { clientId: string; clientSecret: string; refreshToken: string }) => Promise<DiscoveredCalendar[]>>

function Harness({ initial, check }: { initial: GoogleDraft; check: Check }) {
  const [draft, setDraft] = useState(initial)
  return <GoogleSettingsEditor draft={draft} check={check} onChange={setDraft} />
}
const show = (initial: GoogleDraft, check: Check = vi.fn(async () => discovered)) => {
  render(<Harness initial={initial} check={check} />)
  return check
}
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement
const button = (name: string) => screen.getByRole('button', { name }) as HTMLButtonElement

afterEach(() => vi.restoreAllMocks())

describe('GoogleSettingsEditor', () => {
  it('explains that events stay on the tablet until Google is connected', () => {
    show(EMPTY_GOOGLE_DRAFT)
    expect(screen.getByText(/zapisują się tylko na tym tablecie/)).toBeTruthy()
    expect(button('Sprawdź połączenie').disabled).toBe(true)
    expect(button('Odłącz Google').disabled).toBe(true)
  })

  it('lets the user type the three values', () => {
    show(EMPTY_GOOGLE_DRAFT)
    fireEvent.change(input('Identyfikator klienta'), { target: { value: 'id' } })
    fireEvent.change(input('Sekret klienta'), { target: { value: 'secret' } })
    fireEvent.change(input('Token odświeżania'), { target: { value: 'token' } })
    expect([input('Identyfikator klienta').value, input('Sekret klienta').value, input('Token odświeżania').value]).toEqual(['id', 'secret', 'token'])
    expect(button('Sprawdź połączenie').disabled).toBe(false)
  })

  it('asks for the missing values and does not allow checking', () => {
    show({ ...EMPTY_GOOGLE_DRAFT, clientId: 'id' })
    expect(screen.getByRole('alert').textContent).toContain('Wypełnij wszystkie trzy pola')
    expect(button('Sprawdź połączenie').disabled).toBe(true)
  })

  it('checks the connection with trimmed values and shows the calendars with sensible defaults', async () => {
    const check = show({ ...filled, clientId: ' id ' })
    fireEvent.click(button('Sprawdź połączenie'))
    expect(await screen.findByText('Połączono. Liczba kalendarzy: 2.')).toBeTruthy()
    expect(check).toHaveBeenCalledWith({ clientId: 'id', clientSecret: 'secret', refreshToken: 'token' })
    expect((screen.getByLabelText('Pokaż: Ja') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Pokaż: Święta') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('Zapisuj tutaj') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText('Tylko do odczytu') as HTMLInputElement).disabled).toBe(true)
  })

  it('shows that it is checking while it waits', async () => {
    let finish: (value: DiscoveredCalendar[]) => void = () => undefined
    show(filled, vi.fn(() => new Promise<DiscoveredCalendar[]>((resolve) => (finish = resolve))) as Check)
    fireEvent.click(button('Sprawdź połączenie'))
    expect(await screen.findByText('Łączenie z Google…')).toBeTruthy()
    expect(button('Sprawdź połączenie').disabled).toBe(true)
    finish(discovered)
    expect(await screen.findByText(/Połączono/)).toBeTruthy()
  })

  it('lets the user change which calendars are shown and where new events go', async () => {
    show(filled, vi.fn(async () => [...discovered, { id: 'work@x', name: 'Praca', canWrite: true, selected: false, primary: false }]))
    fireEvent.click(button('Sprawdź połączenie'))
    await screen.findByText(/Połączono/)
    fireEvent.click(screen.getByLabelText('Pokaż: Święta'))
    expect((screen.getByLabelText('Pokaż: Święta') as HTMLInputElement).checked).toBe(true)
    fireEvent.click(screen.getByLabelText('Pokaż: Ja'))
    expect((screen.getByLabelText('Pokaż: Ja') as HTMLInputElement).checked).toBe(false)
    const writeChoices = screen.getAllByLabelText('Zapisuj tutaj') as HTMLInputElement[]
    fireEvent.click(writeChoices[1])
    expect(writeChoices.map((choice) => choice.checked)).toEqual([false, true])
  })

  it('shows the Polish reason when Google refuses, and a general one otherwise', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const check = show(filled, vi.fn(async () => Promise.reject(new UserFacingError('Token odświeżania wygasł.'))))
    fireEvent.click(button('Sprawdź połączenie'))
    expect((await screen.findByRole('alert')).textContent).toBe('Token odświeżania wygasł.')
    check.mockRejectedValueOnce(new Error('boom'))
    fireEvent.click(button('Sprawdź połączenie'))
    expect(await screen.findByText('Nie udało się połączyć z Google.')).toBeTruthy()
  })

  it('disconnects: clears the values, the calendars and the status', async () => {
    show(filled)
    fireEvent.click(button('Sprawdź połączenie'))
    await screen.findByText(/Połączono/)
    fireEvent.click(button('Odłącz Google'))
    expect(input('Identyfikator klienta').value).toBe('')
    expect(screen.queryByText(/Połączono/)).toBeNull()
    expect(screen.queryByLabelText('Pokaż: Ja')).toBeNull()
  })
})
