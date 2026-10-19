import type { CalendarEvent } from '../calendar/types'
import { UserFacingError } from '../shared/userFacingError'
import type { AssistantSession, RecordedAudio, ToolResult } from './assistant.port'
import type { ToolExecutor } from './toolExecutor'

/** A command needs a few tool rounds at most (list, change, answer); more means the model is going in circles. */
const MAX_ROUNDS = 6

export interface AssistantRun {
  /** What the model said to the user (may be empty). */
  text: string
  /** What was changed in the calendar, one line each. */
  actions: string[]
  /** Deletes the model asked for; none has happened yet. */
  pendingDeletes: CalendarEvent[]
}

/** Sends the recording to the model and runs its tool calls until it answers in words. */
export async function runAssistant(session: AssistantSession, executor: ToolExecutor, audio: RecordedAudio): Promise<AssistantRun> {
  const actions: string[] = []
  const pendingDeletes: CalendarEvent[] = []
  let turn = await session.ask(audio)

  for (let round = 0; round < MAX_ROUNDS; round++) {
    if (turn.calls.length === 0) return { text: turn.text, actions, pendingDeletes }
    const results: ToolResult[] = []
    for (const call of turn.calls) {
      const outcome = await executor.execute(call)
      results.push({ id: call.id, name: call.name, output: outcome.output })
      if (outcome.kind === 'confirm') pendingDeletes.push(outcome.event)
      else if (outcome.summary !== undefined) actions.push(outcome.summary)
    }
    turn = await session.answer(results)
  }
  throw new UserFacingError('Asystent wykonał zbyt wiele kroków. Spróbuj prostszego polecenia.')
}
