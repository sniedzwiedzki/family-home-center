import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PinPad } from './PinPad'

const press = (...keys: string[]) => keys.forEach((key) => fireEvent.click(screen.getByRole('button', { name: key })))
const display = () => screen.getByLabelText('Wpisane cyfry').textContent

describe('PinPad', () => {
  it('shows the title and masks entered digits', () => {
    render(<PinPad title="Wpisz PIN" error={null} onSubmit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Wpisz PIN' })).toBeTruthy()
    press('1', '2', '3')
    expect(display()).toBe('●●●')
  })

  it('accepts at most 8 digits', () => {
    render(<PinPad title="t" error={null} onSubmit={vi.fn()} />)
    press('1', '2', '3', '4', '5', '6', '7', '8', '9')
    expect(display()).toBe('●●●●●●●●')
  })

  it('deletes the last digit', () => {
    render(<PinPad title="t" error={null} onSubmit={vi.fn()} />)
    press('1', '2')
    fireEvent.click(screen.getByRole('button', { name: 'Usuń cyfrę' }))
    expect(display()).toBe('●')
  })

  it('keeps OK disabled below 4 digits', () => {
    render(<PinPad title="t" error={null} onSubmit={vi.fn()} />)
    press('1', '2', '3')
    expect((screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement).disabled).toBe(true)
    press('4')
    expect((screen.getByRole('button', { name: 'OK' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('submits the digits and clears the display', () => {
    const onSubmit = vi.fn()
    render(<PinPad title="t" error={null} onSubmit={onSubmit} />)
    press('1', '2', '3', '4', '0')
    fireEvent.click(screen.getByRole('button', { name: 'OK' }))
    expect(onSubmit).toHaveBeenCalledWith('12340')
    expect(display()).toBe('')
  })

  it('shows an error when given one, and none otherwise', () => {
    const { rerender } = render(<PinPad title="t" error={null} onSubmit={vi.fn()} />)
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<PinPad title="t" error="Źle" onSubmit={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toBe('Źle')
  })
})
