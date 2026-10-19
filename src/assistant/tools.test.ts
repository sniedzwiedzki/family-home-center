import { describe, expect, it } from 'vitest'
import {
  CREATE_EVENT,
  createEventArgsSchema,
  deleteEventArgsSchema,
  listEventsArgsSchema,
  TOOL_DECLARATIONS,
  updateEventArgsSchema,
} from './tools'

describe('tool declarations', () => {
  it('declare each tool once, with every required argument defined', () => {
    const names = TOOL_DECLARATIONS.map((tool) => tool.name)
    expect(new Set(names).size).toBe(names.length)
    for (const tool of TOOL_DECLARATIONS) {
      const { properties, required } = tool.parameters as { properties: Record<string, unknown>; required: string[] }
      for (const name of required) expect(properties).toHaveProperty(name)
    }
  })

  it('make only the title and the date mandatory for a new event', () => {
    const create = TOOL_DECLARATIONS.find((tool) => tool.name === CREATE_EVENT)!
    expect((create.parameters as { required: string[] }).required).toEqual(['title', 'date'])
  })
})

describe('argument schemas', () => {
  it('accept well-formed arguments', () => {
    expect(listEventsArgsSchema.safeParse({ from: '2026-10-19', to: '2026-10-25' }).success).toBe(true)
    expect(createEventArgsSchema.safeParse({ title: 'Dentysta', date: '2026-10-21', startTime: '15:30', tags: ['anna'] }).success).toBe(true)
    expect(deleteEventArgsSchema.safeParse({ eventId: 'a|b' }).success).toBe(true)
  })

  it('reject malformed dates and times', () => {
    expect(listEventsArgsSchema.safeParse({ from: '19.10.2026', to: '2026-10-25' }).success).toBe(false)
    expect(createEventArgsSchema.safeParse({ title: 'X', date: '2026-10-21', startTime: '3pm' }).success).toBe(false)
  })

  it('require the event id for an update but make every other field optional', () => {
    expect(updateEventArgsSchema.safeParse({ eventId: 'a|b' }).success).toBe(true)
    expect(updateEventArgsSchema.safeParse({ title: 'Nowy' }).success).toBe(false)
  })

  it('reject arguments of the wrong type', () => {
    expect(createEventArgsSchema.safeParse({ title: 5, date: '2026-10-21' }).success).toBe(false)
  })
})
