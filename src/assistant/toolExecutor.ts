import type { ZodError } from 'zod'
import { addDays } from '../calendar/days'
import { draftFromEvent, draftToInput, parseDate, type EventDraft } from '../calendar/eventDraft'
import { NO_REPEAT, REPEAT_LABELS } from '../calendar/recurrence'
import type { CalendarEvent, CalendarPort } from '../calendar/types'
import { normalizeTag, type FamilyMember } from '../family/familyMember'
import type { ToolCall } from './assistant.port'
import {
  CREATE_EVENT,
  createEventArgsSchema,
  DELETE_EVENT,
  deleteEventArgsSchema,
  LIST_EVENTS,
  listEventsArgsSchema,
  UPDATE_EVENT,
  updateEventArgsSchema,
  WEEKDAY_NAMES,
} from './tools'

/** Keeps the answer to the model (and so its cost) bounded when a range is crowded. */
const MAX_LISTED_EVENTS = 100
const LAST_HOUR = 23
const LAST_MINUTE_OF_DAY = '23:59'

export type ToolOutcome =
  /** `summary` is shown to the user when the call changed the calendar. */
  | { kind: 'done'; output: unknown; summary?: string }
  /** Deleting waits for the user's explicit confirmation in the dialog. */
  | { kind: 'confirm'; output: unknown; event: CalendarEvent }

export interface ToolExecutor {
  execute(call: ToolCall): Promise<ToolOutcome>
  /** Runs a delete the user has confirmed. */
  deleteConfirmed(event: CalendarEvent): Promise<void>
}

interface ToolExecutorOptions {
  port: CalendarPort
  members: readonly FamilyMember[]
  /** The tag that marks a special event; the assistant keeps it when it changes an event but never sets it. */
  specialTag: string
}

const failure = (error: string): ToolOutcome => ({ kind: 'done', output: { error } })
const invalid = (error: ZodError): ToolOutcome => failure(`Invalid arguments: ${error.message}`)

const pad = (value: number) => String(value).padStart(2, '0')

function oneHourLater(startTime: string): string {
  const hours = Number(startTime.slice(0, 2))
  return hours >= LAST_HOUR ? LAST_MINUTE_OF_DAY : `${pad(hours + 1)}:${startTime.slice(3)}`
}

/** Runs the model's tool calls against the calendar port, treating every argument as untrusted. */
export function createToolExecutor({ port, members, specialTag }: ToolExecutorOptions): ToolExecutor {
  // Only events the model has seen in this session can be changed or deleted.
  const known = new Map<string, CalendarEvent>()
  const knownTags = members.map((member) => member.tag)
  // Events created by this command, by title and first day: the model must not create the same one twice.
  const created = new Map<string, string>()

  function view(event: CalendarEvent) {
    const draft = draftFromEvent(event, members, specialTag)
    return {
      id: event.id,
      title: draft.title,
      description: draft.description,
      tags: members.filter((member) => draft.memberIds.includes(member.id)).map((member) => member.tag),
      allDay: draft.allDay,
      recurring: event.recurringEventId !== undefined,
      date: draft.startDate,
      endDate: draft.endDate,
      ...(draft.allDay ? {} : { startTime: draft.startTime, endTime: draft.endTime }),
    }
  }

  function memberIdsFor(tags: readonly string[]): string[] | string {
    const normalized = tags.map(normalizeTag)
    const unknown = normalized.filter((tag) => !knownTags.includes(tag))
    if (unknown.length > 0) return `Unknown tags: ${unknown.join(', ')}. Known tags: ${knownTags.join(', ') || 'none'}.`
    return members.filter((member) => normalized.includes(member.tag)).map((member) => member.id)
  }

  async function listEvents(args: unknown): Promise<ToolOutcome> {
    const input = listEventsArgsSchema.safeParse(args)
    if (!input.success) return invalid(input.error)
    const parsed = input.data
    const from = parseDate(parsed.from)
    const to = parseDate(parsed.to)
    if (from === null || to === null || to < from) return failure('Invalid date range.')
    const events = (await port.listEvents({ from, to: addDays(to, 1) })).sort((a, b) => a.start.getTime() - b.start.getTime())
    const shown = events.slice(0, MAX_LISTED_EVENTS)
    for (const event of shown) known.set(event.id, event)
    return { kind: 'done', output: { events: shown.map(view), truncated: events.length > shown.length } }
  }

  async function createEvent(args: unknown): Promise<ToolOutcome> {
    const input = createEventArgsSchema.safeParse(args)
    if (!input.success) return invalid(input.error)
    const parsed = input.data
    const memberIds = memberIdsFor(parsed.tags ?? [])
    if (typeof memberIds === 'string') return failure(memberIds)
    const startTime = parsed.startTime ?? ''
    if (parsed.repeat !== undefined && port.series === undefined) return failure('Repeating events need Google Calendar: it is not connected, so create a single event.')
    const draft: EventDraft = {
      repeat: parsed.repeat ?? NO_REPEAT.repeat,
      // Weekday names count from Monday as in the tool; the calendar counts from Sunday = 0.
      repeatDays: (parsed.repeatDays ?? []).map((name) => (WEEKDAY_NAMES.indexOf(name) + 1) % WEEKDAY_NAMES.length),
      repeatUntil: parsed.repeatUntil ?? NO_REPEAT.repeatUntil,
      title: parsed.title,
      description: parsed.description ?? '',
      memberIds,
      special: null,
      allDay: parsed.allDay ?? parsed.startTime === undefined,
      startDate: parsed.date,
      endDate: parsed.endDate ?? parsed.date,
      startTime,
      endTime: parsed.endTime ?? (startTime === '' ? '' : oneHourLater(startTime)),
    }
    const result = draftToInput(draft, members)
    if (!result.ok) return failure(Object.values(result.errors).join('; '))
    const key = `${result.input.title.toLowerCase()}|${draft.startDate}`
    const earlierId = created.get(key)
    if (earlierId !== undefined) return failure(`This event was already created in this command (id ${earlierId}). Do not create it again; use update_event to change it.`)
    const event = await port.createEvent(result.input)
    known.set(event.id, event)
    created.set(key, event.id)
    return { kind: 'done', output: { created: view(event) }, summary: `Dodano wydarzenie „${event.title}” (${draft.startDate}${draft.repeat === 'none' ? '' : `, ${REPEAT_LABELS[draft.repeat].toLowerCase()}`}).` }
  }

  async function updateEvent(args: unknown): Promise<ToolOutcome> {
    const input = updateEventArgsSchema.safeParse(args)
    if (!input.success) return invalid(input.error)
    const parsed = input.data
    const existing = known.get(parsed.eventId)
    if (existing === undefined) return failure('Unknown eventId: call list_events first and use an id it returned.')
    const memberIds = parsed.tags === undefined ? undefined : memberIdsFor(parsed.tags)
    if (typeof memberIds === 'string') return failure(memberIds)
    const current = draftFromEvent(existing, members, specialTag)
    const startDate = parsed.date ?? current.startDate
    const draft: EventDraft = {
      ...NO_REPEAT,
      title: parsed.title ?? current.title,
      description: parsed.description ?? current.description,
      memberIds: memberIds ?? current.memberIds,
      special: current.special,
      allDay: parsed.allDay ?? (parsed.startTime === undefined ? current.allDay : false),
      startDate,
      // A one-day event follows its date; a longer one needs an explicit end date.
      endDate: parsed.endDate ?? (current.startDate === current.endDate ? startDate : current.endDate),
      startTime: parsed.startTime ?? current.startTime,
      endTime: parsed.endTime ?? (parsed.startTime === undefined ? current.endTime : oneHourLater(parsed.startTime)),
    }
    const result = draftToInput(draft, members, existing)
    if (!result.ok) return failure(Object.values(result.errors).join('; '))
    await port.updateEvent({ ...result.input, id: existing.id })
    known.set(existing.id, { ...result.input, id: existing.id })
    return { kind: 'done', output: { updated: view({ ...result.input, id: existing.id }) }, summary: `Zmieniono wydarzenie „${result.input.title}”.` }
  }

  function deleteEvent(args: unknown): ToolOutcome {
    const input = deleteEventArgsSchema.safeParse(args)
    if (!input.success) return invalid(input.error)
    const parsed = input.data
    const event = known.get(parsed.eventId)
    if (event === undefined) return failure('Unknown eventId: call list_events first and use an id it returned.')
    return { kind: 'confirm', event, output: { status: 'waiting_for_the_user_to_confirm' } }
  }

  return {
    execute: async (call) => {
      if (call.name === LIST_EVENTS) return listEvents(call.args)
      if (call.name === CREATE_EVENT) return createEvent(call.args)
      if (call.name === UPDATE_EVENT) return updateEvent(call.args)
      if (call.name === DELETE_EVENT) return deleteEvent(call.args)
      return failure(`Unknown tool: ${call.name}.`)
    },
    deleteConfirmed: async (event) => {
      await port.deleteEvent(event, 'occurrence')
      known.delete(event.id)
    },
  }
}

