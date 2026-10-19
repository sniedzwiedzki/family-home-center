import { z } from 'zod'
import { UserFacingError } from '../shared/userFacingError'
import type { AssistantContext, AssistantPort, AssistantSession, ModelTurn, RecordedAudio, ToolResult } from './assistant.port'
import { buildSystemInstruction } from './systemInstruction'
import type { ToolDeclaration } from './tools'

interface GeminiOptions {
  fetchImpl: typeof fetch
  /** Up to and including the API version, e.g. `https://generativelanguage.googleapis.com/v1beta`. */
  baseUrl: string
  apiKey: string
  model: string
  tools: readonly ToolDeclaration[]
}

// Steps are kept whole (loose objects): the API wants the model's own steps, thoughts included, sent back unchanged.
const stepSchema = z.looseObject({ type: z.string() })
const responseSchema = z.object({ steps: z.array(stepSchema).default([]) })
const functionCallSchema = z.object({ id: z.string(), name: z.string(), arguments: z.unknown() })
const modelOutputSchema = z.object({ content: z.array(z.looseObject({ type: z.string(), text: z.string().optional() })).default([]) })

type Step = z.infer<typeof stepSchema>

const UNREADABLE = 'Nie udało się odczytać odpowiedzi Gemini.'
const AUDIO_PROMPT = 'Carry out the command spoken in this recording.'

function messageFor(status: number): string {
  if (status === 400) return 'Gemini odrzuciło żądanie (400). Sprawdź klucz API i model w ustawieniach.'
  if (status === 401 || status === 403) return `Gemini odmówiło dostępu (${status}). Sprawdź klucz API w ustawieniach.`
  if (status === 404) return 'Nie znaleziono modelu Gemini (404). Sprawdź nazwę modelu w ustawieniach.'
  if (status === 429) return 'Przekroczono limit zapytań do Gemini (429). Spróbuj ponownie za chwilę.'
  if (status >= 500) return `Gemini jest chwilowo niedostępne (${status}). Spróbuj ponownie za chwilę.`
  return `Gemini zgłosiło błąd (${status}).`
}

function toTurn(steps: readonly Step[]): ModelTurn {
  const calls = steps.filter((step) => step.type === 'function_call').map((step) => {
    const { id, name, arguments: args } = functionCallSchema.parse(step)
    return { id, name, args }
  })
  const text = steps
    .filter((step) => step.type === 'model_output')
    .flatMap((step) => modelOutputSchema.parse(step).content)
    .flatMap((part) => (part.type === 'text' && part.text !== undefined ? [part.text] : []))
    .join('\n')
    .trim()
  return { calls, text }
}

/** The Gemini (Interactions API) implementation of the assistant port. Nothing is stored at Google: every call sends the whole history. */
export function createGeminiAssistant({ fetchImpl, baseUrl, apiKey, model, tools }: GeminiOptions): AssistantPort {
  const declarations = tools.map((tool) => ({ type: 'function', ...tool }))

  async function generate(systemInstruction: string, history: readonly unknown[]): Promise<Step[]> {
    let response: Response
    try {
      response = await fetchImpl(`${baseUrl}/interactions`, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, store: false, system_instruction: systemInstruction, input: history, tools: declarations }),
      })
    } catch (error) {
      throw new UserFacingError('Brak połączenia z Gemini.', { cause: error })
    }
    if (!response.ok) throw new UserFacingError(messageFor(response.status))
    try {
      return responseSchema.parse(await response.json()).steps
    } catch (error) {
      throw new UserFacingError(UNREADABLE, { cause: error })
    }
  }

  return {
    startSession(context: AssistantContext): AssistantSession {
      const systemInstruction = buildSystemInstruction(context)
      const history: unknown[] = []

      async function next(): Promise<ModelTurn> {
        const steps = await generate(systemInstruction, history)
        history.push(...steps)
        try {
          return toTurn(steps)
        } catch (error) {
          throw new UserFacingError(UNREADABLE, { cause: error })
        }
      }

      return {
        ask: (audio: RecordedAudio) => {
          history.push({
            type: 'user_input',
            content: [
              { type: 'text', text: AUDIO_PROMPT },
              { type: 'audio', data: audio.base64, mime_type: audio.mimeType },
            ],
          })
          return next()
        },
        answer: (results: readonly ToolResult[]) => {
          for (const { id, name, output } of results) {
            history.push({ type: 'function_result', name, call_id: id, result: [{ type: 'text', text: JSON.stringify(output) }] })
          }
          return next()
        },
      }
    },
  }
}
