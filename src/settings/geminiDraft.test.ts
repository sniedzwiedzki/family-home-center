import { describe, expect, it } from 'vitest'
import { draftFromGemini, geminiFromDraft } from './geminiDraft'
import { DEFAULT_GEMINI_MODEL } from './settings'

describe('draftFromGemini', () => {
  it('is empty with the default model when Gemini is not configured', () => {
    expect(draftFromGemini(null)).toEqual({ apiKey: '', model: DEFAULT_GEMINI_MODEL })
  })

  it('copies the stored key and model', () => {
    expect(draftFromGemini({ apiKey: 'fake-key', model: 'gemini-x' })).toEqual({ apiKey: 'fake-key', model: 'gemini-x' })
  })
})

describe('geminiFromDraft', () => {
  it('stores nothing when the key is empty', () => {
    expect(geminiFromDraft({ apiKey: '  ', model: 'gemini-x' })).toBeNull()
  })

  it('trims the key and the model', () => {
    expect(geminiFromDraft({ apiKey: ' fake-key ', model: ' gemini-x ' })).toEqual({ apiKey: 'fake-key', model: 'gemini-x' })
  })

  it('falls back to the default model when the model is empty', () => {
    expect(geminiFromDraft({ apiKey: 'fake-key', model: ' ' })).toEqual({ apiKey: 'fake-key', model: DEFAULT_GEMINI_MODEL })
  })
})
