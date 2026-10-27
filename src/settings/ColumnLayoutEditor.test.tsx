import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_COLUMN_LAYOUT } from '../calendar/columns'
import { ColumnLayoutEditor } from './ColumnLayoutEditor'
import { draftFromColumnLayout } from './columnLayoutDraft'

const draft = draftFromColumnLayout(DEFAULT_COLUMN_LAYOUT)

describe('ColumnLayoutEditor', () => {
  it('shows a width for each column and the work tag', () => {
    render(<ColumnLayoutEditor draft={draft} onChange={vi.fn()} />)
    expect(['Wszystkie', 'Powtarzalne', 'Praca', 'Inne'].map((label) => (screen.getByLabelText(label) as HTMLInputElement).value)).toEqual(['3', '2', '1.5', '1.5'])
    expect((screen.getByLabelText('Tag pracy') as HTMLInputElement).value).toBe('praca')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports each change', () => {
    const onChange = vi.fn()
    render(<ColumnLayoutEditor draft={draft} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Powtarzalne'), { target: { value: '2.5' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...draft, recurring: '2.5' })
    fireEvent.change(screen.getByLabelText('Tag pracy'), { target: { value: 'biuro' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...draft, workTag: 'biuro' })
  })

  it('says what is wrong while a value is not valid', () => {
    render(<ColumnLayoutEditor draft={{ ...draft, all: '0' }} onChange={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toContain('od 0,5 do 10')
  })
})
