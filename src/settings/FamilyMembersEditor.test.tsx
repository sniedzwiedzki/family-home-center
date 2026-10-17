import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { DraftMember, MemberErrors } from '../family/memberErrors'
import { FamilyMembersEditor } from './FamilyMembersEditor'

const anna: DraftMember = { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }
const jan: DraftMember = { id: 'j', name: 'Jan', tag: 'jan', color: '#00ff00' }

afterEach(() => vi.restoreAllMocks())

describe('FamilyMembersEditor', () => {
  it('lists a row per member', () => {
    render(<FamilyMembersEditor members={[anna, jan]} errors={[{}, {}]} onChange={vi.fn()} />)
    expect((screen.getAllByLabelText('Imię') as HTMLInputElement[]).map((input) => input.value)).toEqual(['Anna', 'Jan'])
    expect((screen.getAllByLabelText('Tag') as HTMLInputElement[]).map((input) => input.value)).toEqual(['anna', 'jan'])
    expect((screen.getAllByLabelText('Kolor') as HTMLInputElement[]).map((input) => input.value)).toEqual(['#ff0000', '#00ff00'])
  })

  it.each([
    ['Imię', { name: 'Ania' }],
    ['Tag', { tag: 'ania' }],
    ['Kolor', { color: '#0000ff' }],
  ])('reports a changed %s for that member only', (label, patch) => {
    const onChange = vi.fn()
    render(<FamilyMembersEditor members={[anna, jan]} errors={[{}, {}]} onChange={onChange} />)
    const value = Object.values(patch)[0]
    fireEvent.change(screen.getAllByLabelText(label)[0], { target: { value } })
    expect(onChange).toHaveBeenCalledWith([{ ...anna, ...patch }, jan])
  })

  it('removes a member', () => {
    const onChange = vi.fn()
    render(<FamilyMembersEditor members={[anna, jan]} errors={[{}, {}]} onChange={onChange} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Usuń' })[0])
    expect(onChange).toHaveBeenCalledWith([jan])
  })

  it('adds an empty member with a fresh id and the next palette color', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('00000000-0000-4000-8000-000000000001')
    const onChange = vi.fn()
    render(<FamilyMembersEditor members={[]} errors={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj osobę' }))
    expect(onChange).toHaveBeenCalledWith([{ id: '00000000-0000-4000-8000-000000000001', name: '', tag: '', color: '#e5484d' }])
  })

  it('wraps around the palette', () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...anna, id: String(i) }))
    const onChange = vi.fn()
    render(<FamilyMembersEditor members={many} errors={many.map(() => ({}))} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dodaj osobę' }))
    expect(onChange.mock.calls[0][0][6].color).toBe('#e5484d')
  })

  it('shows the errors of each member', () => {
    const errors: MemberErrors[] = [{ name: 'Podaj imię', tag: 'Zły tag' }, {}]
    render(<FamilyMembersEditor members={[anna, jan]} errors={errors} onChange={vi.fn()} />)
    expect(screen.getAllByRole('alert').map((alert) => alert.textContent)).toEqual(['Podaj imię', 'Zły tag'])
  })
})
