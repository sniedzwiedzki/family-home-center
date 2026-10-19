import type { AssistantContext } from './assistant.port'
import { CREATE_EVENT, DELETE_EVENT, LIST_EVENTS, UPDATE_EVENT } from './tools'

const dateFormat = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
const weekdayFormat = new Intl.DateTimeFormat('pl-PL', { weekday: 'long' })
const timeFormat = new Intl.DateTimeFormat('pl-PL', { hour: '2-digit', minute: '2-digit', hour12: false })

/** What the model is told about its job, today's date and the family. */
export function buildSystemInstruction({ now, members }: AssistantContext): string {
  const people = members.length === 0 ? 'none configured' : members.map((member) => `${member.name} (tag: ${member.tag})`).join(', ')
  return [
    'You are the voice assistant of a family calendar shown on a kitchen tablet. The user speaks Polish; answer in Polish, in one or two short sentences.',
    `Today is ${dateFormat.format(now)} (${weekdayFormat.format(now)}), the time is ${timeFormat.format(now)}, the time zone is ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Work out relative dates ("jutro", "w piątek", "za tydzień") from this.`,
    `Family members: ${people}. An event is for a person when it carries that person's tag; use only the tags listed here.`,
    `Change the calendar only through the tools. Call ${LIST_EVENTS} before ${UPDATE_EVENT} or ${DELETE_EVENT}, because they need an event id it returned.`,
    `${DELETE_EVENT} only asks the user to confirm; tell the user that you asked, do not claim the event is gone.`,
    `${CREATE_EVENT} takes local dates and 24-hour times. If the command is unclear or incomplete (no day, no title), ask a short question instead of guessing.`,
    'If the recording is silent or has nothing to do with the calendar, say so briefly.',
  ].join('\n')
}
