import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { GeminiSettingsEditor } from './GeminiSettingsEditor'

const draft = { apiKey: 'fake-key', model: 'gemini-x' }

describe('GeminiSettingsEditor', () => {
  it('shows the key (masked) and the model', () => {
    render(<GeminiSettingsEditor draft={draft} onChange={vi.fn()} />)
    const key = screen.getByLabelText('Klucz API Gemini') as HTMLInputElement
    expect(key.type).toBe('password')
    expect(key.value).toBe('fake-key')
    expect((screen.getByLabelText('Model Gemini') as HTMLInputElement).value).toBe('gemini-x')
  })

  it('reports edits of the key and of the model', () => {
    const onChange = vi.fn()
    render(<GeminiSettingsEditor draft={draft} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Klucz API Gemini'), { target: { value: 'other' } })
    expect(onChange).toHaveBeenLastCalledWith({ apiKey: 'other', model: 'gemini-x' })
    fireEvent.change(screen.getByLabelText('Model Gemini'), { target: { value: 'gemini-y' } })
    expect(onChange).toHaveBeenLastCalledWith({ apiKey: 'fake-key', model: 'gemini-y' })
  })

  it('links to the place where a key is created', () => {
    render(<GeminiSettingsEditor draft={draft} onChange={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Google AI Studio' }).getAttribute('href')).toBe('https://aistudio.google.com/apikey')
  })
})
