import { z } from 'zod'

export const LIST_EVENTS = 'list_events'
export const CREATE_EVENT = 'create_event'
export const UPDATE_EVENT = 'update_event'
export const DELETE_EVENT = 'delete_event'

export interface ToolDeclaration {
  name: string
  description: string
  /** JSON Schema of the arguments. */
  parameters: Record<string, unknown>
}

const date = { type: 'string', description: 'Local date, YYYY-MM-DD.' }
const time = { type: 'string', description: 'Local time, 24-hour HH:mm.' }
const eventFields = {
  title: { type: 'string', description: 'Event title without #tags.' },
  date: { ...date, description: 'First day of the event, YYYY-MM-DD.' },
  endDate: { ...date, description: 'Last day of the event (inclusive); omit for a one-day event.' },
  startTime: { ...time, description: 'Start time; omit for an all-day event.' },
  endTime: { ...time, description: 'End time; omit to default to one hour after the start.' },
  allDay: { type: 'boolean', description: 'True for an all-day event.' },
  tags: { type: 'array', items: { type: 'string' }, description: 'Tags of the family members the event is for.' },
  description: { type: 'string', description: 'Longer notes for the event.' },
}

export const REPEAT_KINDS = ['weekly', 'weekdays', 'monthly', 'yearly'] as const
export const WEEKDAY_NAMES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

const repeatFields = {
  repeat: {
    type: 'string',
    enum: REPEAT_KINDS,
    description:
      'Makes the event repeat: weekly = every week on the weekday of the start, weekdays = every week on repeatDays, monthly = every month on that day of the month, yearly = every year on that day. Omit for a one-off event.',
  },
  repeatDays: { type: 'array', items: { type: 'string', enum: WEEKDAY_NAMES }, description: 'Weekdays for repeat = weekdays.' },
  repeatUntil: { ...date, description: 'Last day of the repetition (inclusive); omit to repeat without end.' },
}

export const TOOL_DECLARATIONS: readonly ToolDeclaration[] = [
  {
    name: LIST_EVENTS,
    description: 'Lists the calendar events from a day to a day (inclusive). Call it before changing or deleting an event: it returns the event ids.',
    parameters: { type: 'object', properties: { from: date, to: date }, required: ['from', 'to'] },
  },
  {
    name: CREATE_EVENT,
    description: 'Creates a calendar event.',
    parameters: { type: 'object', properties: { ...eventFields, ...repeatFields }, required: ['title', 'date'] },
  },
  {
    name: UPDATE_EVENT,
    description: 'Changes an event returned by list_events. Pass only the fields that change.',
    parameters: { type: 'object', properties: { eventId: { type: 'string' }, ...eventFields }, required: ['eventId'] },
  },
  {
    name: DELETE_EVENT,
    description: 'Asks the user to confirm deleting an event returned by list_events. The event is deleted only after the user agrees.',
    parameters: { type: 'object', properties: { eventId: { type: 'string' } }, required: ['eventId'] },
  },
]

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/)

const eventFieldsSchema = {
  title: z.string(),
  date: dateSchema,
  endDate: dateSchema.optional(),
  startTime: timeSchema.optional(),
  endTime: timeSchema.optional(),
  allDay: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
}

const repeatFieldsSchema = {
  repeat: z.enum(REPEAT_KINDS).optional(),
  repeatDays: z.array(z.enum(WEEKDAY_NAMES)).optional(),
  repeatUntil: dateSchema.optional(),
}

export const listEventsArgsSchema = z.object({ from: dateSchema, to: dateSchema })
export const createEventArgsSchema = z.object({ ...eventFieldsSchema, ...repeatFieldsSchema })
export const updateEventArgsSchema = z.object({ eventId: z.string(), ...eventFieldsSchema }).partial().required({ eventId: true })
export const deleteEventArgsSchema = z.object({ eventId: z.string() })
