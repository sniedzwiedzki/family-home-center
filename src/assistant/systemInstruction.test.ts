import { describe, expect, it } from 'vitest'
import { buildSystemInstruction } from './systemInstruction'

const members = [
  { id: 'a', name: 'Anna', tag: 'anna', color: '#ff0000' },
  { id: 'j', name: 'Jan', tag: 'jan', color: '#0000ff' },
]
const now = new Date(2026, 9, 19, 8, 5)

describe('buildSystemInstruction', () => {
  it('tells the model today\'s date, weekday and time', () => {
    const text = buildSystemInstruction({ now, members })
    expect(text).toContain('Today is 2026-10-19 (poniedziałek), the time is 08:05')
    expect(text).toContain(Intl.DateTimeFormat().resolvedOptions().timeZone)
  })

  it('lists the family members with their tags', () => {
    expect(buildSystemInstruction({ now, members })).toContain('Family members: Anna (tag: anna), Jan (tag: jan).')
  })

  it('says when nobody is configured', () => {
    expect(buildSystemInstruction({ now, members: [] })).toContain('Family members: none configured.')
  })

  it('tells the model to create an event once', () => {
    expect(buildSystemInstruction({ now, members })).toContain('Create each event exactly once')
  })

  it('explains how to repeat an event and that it needs Google', () => {
    const text = buildSystemInstruction({ now, members })
    expect(text).toContain('pass repeat to create_event')
    expect(text).toContain('repeating needs Google Calendar')
  })

  it('names the tools and the confirmation rule for deleting', () => {
    const text = buildSystemInstruction({ now, members })
    for (const tool of ['list_events', 'create_event', 'update_event', 'delete_event']) expect(text).toContain(tool)
    expect(text).toContain('only asks the user to confirm')
  })
})
