import { DEFAULT_GEMINI_MODEL, type Settings } from './settings'

export interface GeminiDraft {
  apiKey: string
  model: string
}

export const draftFromGemini = (gemini: Settings['gemini']): GeminiDraft => ({
  apiKey: gemini?.apiKey ?? '',
  model: gemini?.model ?? DEFAULT_GEMINI_MODEL,
})

/** What is stored: nothing at all when the key was cleared; an empty model name falls back to the default. */
export function geminiFromDraft(draft: GeminiDraft): Settings['gemini'] {
  const apiKey = draft.apiKey.trim()
  if (apiKey === '') return null
  return { apiKey, model: draft.model.trim() || DEFAULT_GEMINI_MODEL }
}
