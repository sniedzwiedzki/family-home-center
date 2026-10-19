import { describe, expect, it, vi } from 'vitest'
import type { CalendarEvent } from '../calendar/types'
import type { AssistantSession, ModelTurn } from './assistant.port'
import { runAssistant } from './runAssistant'
import type { ToolExecutor, ToolOutcome } from './toolExecutor'

const audio = { base64: 'AAAA', mimeType: 'audio/webm' }
const text = (value: string): ModelTurn => ({ calls: [], text: value })
const callTurn = (...names: string[]): ModelTurn => ({ calls: names.map((name, index) => ({ id: `c${index}`, name, args: {} })), text: '' })
const event: CalendarEvent = { id: 'e1', title: 'Dentysta', allDay: false, start: new Date(2026, 9, 21, 15), end: new Date(2026, 9, 21, 16) }

function sessionOf(turns: ModelTurn[]): AssistantSession & { ask: ReturnType<typeof vi.fn>; answer: ReturnType<typeof vi.fn> } {
  const queue = [...turns]
  return { ask: vi.fn(async () => queue.shift()!), answer: vi.fn(async () => queue.shift()!) }
}

const executorOf = (outcomes: Record<string, ToolOutcome>): ToolExecutor => ({
  execute: vi.fn(async (call) => outcomes[call.name]),
  deleteConfirmed: vi.fn(),
})

describe('runAssistant', () => {
  it('returns the answer when the model needs no tools', async () => {
    const session = sessionOf([text('Nic do zrobienia.')])
    const run = await runAssistant(session, executorOf({}), audio)
    expect(run).toEqual({ text: 'Nic do zrobienia.', actions: [], pendingDeletes: [] })
    expect(session.ask).toHaveBeenCalledWith(audio)
  })

  it('runs the requested tools, feeds the results back and collects what changed', async () => {
    const session = sessionOf([callTurn('list_events'), callTurn('create_event'), text('Dodane.')])
    const executor = executorOf({
      list_events: { kind: 'done', output: { events: [] } },
      create_event: { kind: 'done', output: { created: {} }, summary: 'Dodano wydarzenie „X”.' },
    })
    const run = await runAssistant(session, executor, audio)
    expect(run).toEqual({ text: 'Dodane.', actions: ['Dodano wydarzenie „X”.'], pendingDeletes: [] })
    expect(session.answer).toHaveBeenNthCalledWith(1, [{ id: 'c0', name: 'list_events', output: { events: [] } }])
    expect(session.answer).toHaveBeenNthCalledWith(2, [{ id: 'c0', name: 'create_event', output: { created: {} } }])
  })

  it('answers every call of a parallel turn in one go', async () => {
    const session = sessionOf([callTurn('list_events', 'list_events'), text('OK')])
    const executor = executorOf({ list_events: { kind: 'done', output: 1 } })
    await runAssistant(session, executor, audio)
    expect(session.answer).toHaveBeenCalledWith([
      { id: 'c0', name: 'list_events', output: 1 },
      { id: 'c1', name: 'list_events', output: 1 },
    ])
  })

  it('collects deletes that wait for the user instead of reporting them as done', async () => {
    const session = sessionOf([callTurn('delete_event'), text('Czy na pewno?')])
    const executor = executorOf({ delete_event: { kind: 'confirm', output: { status: 'waiting' }, event } })
    const run = await runAssistant(session, executor, audio)
    expect(run).toEqual({ text: 'Czy na pewno?', actions: [], pendingDeletes: [event] })
  })

  it('does not list a failed call as a change', async () => {
    const session = sessionOf([callTurn('create_event'), text('Nie wyszło.')])
    const run = await runAssistant(session, executorOf({ create_event: { kind: 'done', output: { error: 'x' } } }), audio)
    expect(run.actions).toEqual([])
  })

  it('gives up when the model keeps calling tools', async () => {
    const turns = Array.from({ length: 10 }, () => callTurn('list_events'))
    const session = sessionOf(turns)
    const executor = executorOf({ list_events: { kind: 'done', output: {} } })
    await expect(runAssistant(session, executor, audio)).rejects.toThrow('Asystent wykonał zbyt wiele kroków')
    expect(executor.execute).toHaveBeenCalledTimes(6)
  })
})
