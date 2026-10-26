import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FontSizeSettingsEditor } from './FontSizeSettingsEditor'
import { DEFAULT_FONT_SIZES, draftFromFontSizes } from './fontSizes'

const draft = draftFromFontSizes(DEFAULT_FONT_SIZES)
const input = (label: string) => screen.getByLabelText(label) as HTMLInputElement

describe('FontSizeSettingsEditor', () => {
  it('shows the current size of each element in a number field', () => {
    render(<FontSizeSettingsEditor draft={draft} onChange={vi.fn()} />)
    expect([input('Tytuł wydarzenia (px)').value, input('Godzina wydarzenia (px)').value, input('Numer dnia miesiąca (px)').value]).toEqual(['20', '16', '41'])
    expect(input('Tytuł wydarzenia (px)').type).toBe('number')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('changes only the field that was edited', () => {
    const onChange = vi.fn()
    render(<FontSizeSettingsEditor draft={draft} onChange={onChange} />)
    fireEvent.change(input('Numer dnia miesiąca (px)'), { target: { value: '50' } })
    expect(onChange).toHaveBeenCalledWith({ ...draft, dayNumber: '50' })
  })

  it('says when a size is not allowed', () => {
    render(<FontSizeSettingsEditor draft={{ ...draft, eventTime: '' }} onChange={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toBe('Podaj rozmiary czcionek jako liczby całkowite od 8 do 120.')
  })
})
