import type { FamilyMember } from '../family/familyMember'

/** A finished microphone recording, ready to be sent to the model. */
export interface RecordedAudio {
  base64: string
  mimeType: string
}

export interface ToolCall {
  id: string
  name: string
  /** Straight from the model: untrusted until a tool schema has parsed it. */
  args: unknown
}

export interface ToolResult {
  id: string
  name: string
  output: unknown
}

/** One answer of the model: tools it wants run and/or text for the user. */
export interface ModelTurn {
  calls: ToolCall[]
  text: string
}

export interface AssistantContext {
  now: Date
  members: readonly FamilyMember[]
}

/** One spoken command and the tool rounds that follow it. */
export interface AssistantSession {
  ask(audio: RecordedAudio): Promise<ModelTurn>
  /** Sends the outcome of the tool calls from the previous turn. */
  answer(results: readonly ToolResult[]): Promise<ModelTurn>
}

export interface AssistantPort {
  startSession(context: AssistantContext): AssistantSession
}
