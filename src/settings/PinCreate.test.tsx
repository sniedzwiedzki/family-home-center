import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PinCreate } from './PinCreate'

const enter = (pin: string) => {
  for (const digit of pin) fireEvent.click(screen.getByRole('button', { name: digit }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

describe('PinCreate', () => {
  it('asks for the PIN twice and creates it when both match', () => {
    const onCreate = vi.fn()
    render(<PinCreate onCreate={onCreate} />)
    expect(screen.getByRole('heading').textContent).toBe('Ustaw PIN do ustawień')
    enter('2468')
    expect(screen.getByRole('heading').textContent).toBe('Powtórz PIN')
    expect(onCreate).not.toHaveBeenCalled()
    enter('2468')
    expect(onCreate).toHaveBeenCalledWith('2468')
  })

  it('starts over with a message when the repeated PIN differs', () => {
    const onCreate = vi.fn()
    render(<PinCreate onCreate={onCreate} />)
    enter('2468')
    enter('1357')
    expect(onCreate).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('PIN-y nie są takie same, spróbuj ponownie')
    expect(screen.getByRole('heading').textContent).toBe('Ustaw PIN do ustawień')
  })
})
