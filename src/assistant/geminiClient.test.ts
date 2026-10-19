import { describe, expect, it, vi } from 'vitest'
import { UserFacingError } from '../shared/userFacingError'
import type { AssistantContext } from './assistant.port'
import { createGeminiAssistant } from './geminiClient'
import { TOOL_DECLARATIONS } from './tools'

const BASE = 'https://gemini.test/v1beta'
const context: AssistantContext = { now: new Date(2026, 9, 19, 8, 5), members: [{ id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' }] }
const audio = { base64: 'AAAA', mimeType: 'audio/webm' }
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const outputStep = (text: string) => ({ type: 'model_output', content: [{ type: 'text', text }] })

function setup(...responses: (Response | Error)[]) {
  const queue = [...responses]
  const fetchImpl = vi.fn(async () => {
    const next = queue.shift()!
    if (next instanceof Error) throw next
    return next
  })
  const assistant = createGeminiAssistant({ fetchImpl, baseUrl: BASE, apiKey: 'fake-key', model: 'gemini-x', tools: TOOL_DECLARATIONS })
  return { fetchImpl, session: assistant.startSession(context) }
}

const lastBody = (fetchImpl: ReturnType<typeof vi.fn>, index = 0) => JSON.parse((fetchImpl.mock.calls[index][1] as RequestInit).body as string)

describe('createGeminiAssistant', () => {
  it('sends the recording to the Interactions API without storing it at Google', async () => {
    const { fetchImpl, session } = setup(json({ steps: [outputStep('Cześć')] }))
    await session.ask(audio)
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe(`${BASE}/interactions`)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'x-goog-api-key': 'fake-key', 'Content-Type': 'application/json' })
    const body = lastBody(fetchImpl)
    expect(body.model).toBe('gemini-x')
    expect(body.store).toBe(false)
    expect(body.system_instruction).toContain('2026-10-19')
    expect(body.input).toEqual([
      {
        type: 'user_input',
        content: [
          { type: 'text', text: expect.any(String) },
          { type: 'audio', data: 'AAAA', mime_type: 'audio/webm' },
        ],
      },
    ])
    expect(body.tools.map((tool: { type: string; name: string }) => `${tool.type}:${tool.name}`)).toEqual([
      'function:list_events',
      'function:create_event',
      'function:update_event',
      'function:delete_event',
    ])
  })

  it('returns the text of the model output', async () => {
    const { session } = setup(json({ steps: [{ type: 'thought', signature: 'x' }, outputStep('Dodane.'), outputStep('Do zobaczenia.')] }))
    expect(await session.ask(audio)).toEqual({ calls: [], text: 'Dodane.\nDo zobaczenia.' })
  })

  it('ignores content parts that are not text and an answer without steps', async () => {
    const { session } = setup(json({ steps: [{ type: 'model_output', content: [{ type: 'image' }, { type: 'text' }] }] }), json({}))
    expect(await session.ask(audio)).toEqual({ calls: [], text: '' })
    expect(await session.answer([])).toEqual({ calls: [], text: '' })
  })

  it('treats a model output without content as empty', async () => {
    const { session } = setup(json({ steps: [{ type: 'model_output' }] }))
    expect(await session.ask(audio)).toEqual({ calls: [], text: '' })
  })

  it('returns the function calls', async () => {
    const { session } = setup(json({ status: 'requires_action', steps: [{ type: 'function_call', id: 'call1', name: 'list_events', arguments: { from: '2026-10-19' } }] }))
    expect(await session.ask(audio)).toEqual({ calls: [{ id: 'call1', name: 'list_events', args: { from: '2026-10-19' } }], text: '' })
  })

  it('sends the history back unchanged, with the tool results appended', async () => {
    const thought = { type: 'thought', signature: 'opaque', extra: { nested: true } }
    const call = { type: 'function_call', id: 'call1', name: 'list_events', arguments: {} }
    const { fetchImpl, session } = setup(json({ steps: [thought, call] }), json({ steps: [outputStep('Gotowe')] }))
    await session.ask(audio)
    const turn = await session.answer([{ id: 'call1', name: 'list_events', output: { events: [] } }])
    expect(turn.text).toBe('Gotowe')
    expect(lastBody(fetchImpl, 1).input.slice(1)).toEqual([
      thought,
      call,
      { type: 'function_result', name: 'list_events', call_id: 'call1', result: [{ type: 'text', text: '{"events":[]}' }] },
    ])
  })

  it('keeps separate sessions separate', async () => {
    const queue = [json({ steps: [outputStep('a')] }), json({ steps: [outputStep('b')] })]
    const fetchImpl = vi.fn(async () => queue.shift()!)
    const assistant = createGeminiAssistant({ fetchImpl, baseUrl: BASE, apiKey: 'k', model: 'm', tools: [] })
    await assistant.startSession(context).ask(audio)
    await assistant.startSession(context).ask(audio)
    expect(lastBody(fetchImpl, 1).input).toHaveLength(1)
    expect(lastBody(fetchImpl, 1).tools).toEqual([])
  })

  it.each([
    [400, /400.*klucz API i model/],
    [401, /401.*klucz API/],
    [403, /403.*klucz API/],
    [404, /Nie znaleziono modelu/],
    [429, /limit zapytań/],
    [503, /chwilowo niedostępne \(503\)/],
    [418, /błąd \(418\)/],
  ])('explains a %i response in Polish', async (status, message) => {
    const { session } = setup(json({ error: { message: 'secret detail' } }, status))
    const failure = await session.ask(audio).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(UserFacingError)
    expect((failure as Error).message).toMatch(message)
    expect((failure as Error).message).not.toContain('secret detail')
  })

  it('reports a network failure', async () => {
    const { session } = setup(new TypeError('failed to fetch'))
    await expect(session.ask(audio)).rejects.toThrow('Brak połączenia z Gemini.')
  })

  it('reports an answer that is not JSON or has the wrong shape', async () => {
    const { session } = setup(new Response('<html>', { status: 200 }), json({ steps: 'nope' }), json({ steps: [{ type: 'function_call', name: 'x' }] }))
    await expect(session.ask(audio)).rejects.toThrow('Nie udało się odczytać odpowiedzi Gemini.')
    await expect(session.answer([])).rejects.toThrow('Nie udało się odczytać odpowiedzi Gemini.')
    await expect(session.answer([])).rejects.toThrow('Nie udało się odczytać odpowiedzi Gemini.')
  })

  it('never puts the key in an error message', async () => {
    const { session } = setup(json({}, 400))
    const failure = (await session.ask(audio).catch((error: unknown) => error)) as Error
    expect(failure.message).not.toContain('fake-key')
  })
})
