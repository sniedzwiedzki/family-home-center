import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PinEntry } from './PinEntry'

const enter = (pin: string) => {
  for (const digit of pin) fireEvent.click(screen.getByRole('button', { name: digit }))
  fireEvent.click(screen.getByRole('button', { name: 'OK' }))
}

describe('PinEntry', () => {
  it('unlocks with the right PIN', () => {
    const onUnlock = vi.fn()
    render(<PinEntry pin="1234" onUnlock={onUnlock} />)
    enter('1234')
    expect(onUnlock).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('rejects a wrong PIN and lets the user try again', () => {
    const onUnlock = vi.fn()
    render(<PinEntry pin="1234" onUnlock={onUnlock} />)
    enter('1111')
    expect(onUnlock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe('Nieprawidłowy PIN')
    enter('1234')
    expect(onUnlock).toHaveBeenCalledTimes(1)
  })
})
