import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SpecialTagEditor } from './SpecialTagEditor'

const input = () => screen.getByLabelText('Tag wydarzenia specjalnego (bez #)') as HTMLInputElement

describe('SpecialTagEditor', () => {
  it('shows the current tag and no error', () => {
    render(<SpecialTagEditor value="star" error={null} onChange={vi.fn()} />)
    expect(input().value).toBe('star')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('reports what was typed', () => {
    const onChange = vi.fn()
    render(<SpecialTagEditor value="star" error={null} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'gwiazda' } })
    expect(onChange).toHaveBeenCalledWith('gwiazda')
  })

  it('says why the tag cannot be saved', () => {
    render(<SpecialTagEditor value="" error="Zły tag" onChange={vi.fn()} />)
    expect(screen.getByRole('alert').textContent).toBe('Zły tag')
  })
})
