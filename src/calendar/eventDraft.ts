import type { FamilyMember } from '../family/familyMember'
import { DEFAULT_COLUMN_LAYOUT } from './columns'
import { addDays, dayKey, startOfDay } from './days'
import { NO_REPEAT, recurrenceFromFields, type RepeatFields } from './recurrence'
import { EVENT_TAGS_PROPERTY, extractTags, stripTitleTags } from './tags'
import type { CalendarEvent, CalendarEventInput } from './types'

export interface EventDraft extends RepeatFields {
  title: string
  description: string
  memberIds: string[]
  /** The special tag when the event is special (shown with a gold star), otherwise null. */
  special: string | null
  /** The work tag when the event belongs in "Praca", otherwise null. */
  work: string | null
  allDay: boolean
  /** `YYYY-MM-DD`, as used by `<input type="date">`. */
  startDate: string
  endDate: string
  /** `HH:mm`, as used by `<input type="time">`. */
  startTime: string
  endTime: string
}

export interface DraftErrors {
  title?: string
  date?: string
  time?: string
  repeat?: string
}

export type DraftResult = { ok: true; input: CalendarEventInput } | { ok: false; errors: DraftErrors }

const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '10:00'

const pad = (value: number) => String(value).padStart(2, '0')
const timeKey = (date: Date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

const LAST_HOUR = 23
const LAST_END_TIME = '23:59'

/** A new event on the day, by default 09:00-10:00; `startHour` (a click on the hour grid) makes it that hour. */
export function newDraft(day: Date, memberIds: string[], startHour?: number, work: string | null = null): EventDraft {
  return {
    title: '',
    description: '',
    memberIds,
    special: null,
    work,
    ...NO_REPEAT,
    allDay: false,
    startDate: dayKey(day),
    endDate: dayKey(day),
    startTime: startHour === undefined ? DEFAULT_START_TIME : `${pad(startHour)}:00`,
    endTime: startHour === undefined ? DEFAULT_END_TIME : startHour >= LAST_HOUR ? LAST_END_TIME : `${pad(startHour + 1)}:00`,
  }
}

export function draftFromEvent(event: CalendarEvent, members: readonly FamilyMember[], specialTag: string, workTag = DEFAULT_COLUMN_LAYOUT.workTag): EventDraft {
  const tags = new Set(extractTags(event))
  const lastDay = event.allDay ? addDays(startOfDay(event.end), -1) : event.end
  return {
    title: stripTitleTags(event.title),
    description: event.description ?? '',
    memberIds: members.filter((member) => tags.has(member.tag)).map((member) => member.id),
    special: tags.has(specialTag) ? specialTag : null,
    work: tags.has(workTag) ? workTag : null,
    ...NO_REPEAT,
    allDay: event.allDay,
    startDate: dayKey(event.start),
    endDate: dayKey(lastDay),
    startTime: event.allDay ? DEFAULT_START_TIME : timeKey(event.start),
    endTime: event.allDay ? DEFAULT_END_TIME : timeKey(event.end),
  }
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_PATTERN = /^(\d{2}):(\d{2})$/

export function parseDate(value: string): Date | null {
  const match = DATE_PATTERN.exec(value)
  if (match === null) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return dayKey(date) === value ? date : null
}

function parseTime(value: string): [number, number] | null {
  const match = TIME_PATTERN.exec(value)
  if (match === null) return null
  const [hours, minutes] = [Number(match[1]), Number(match[2])]
  return hours < 24 && minutes < 60 ? [hours, minutes] : null
}

const atTime = (day: Date, [hours, minutes]: [number, number]) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), hours, minutes)

/** Validates the form and turns it into an event. People and the special mark become tags in a hidden property; `#tags` typed in the title count too. */
export function draftToInput(draft: EventDraft, members: readonly FamilyMember[], existing?: CalendarEvent): DraftResult {
  const errors: DraftErrors = {}
  const title = stripTitleTags(draft.title)
  const typedTags = extractTags({ title: draft.title })
  if (title === '') errors.title = 'Podaj tytuł'

  const startDay = parseDate(draft.startDate)
  const endDay = parseDate(draft.endDate)
  if (startDay === null || endDay === null) errors.date = 'Podaj datę'

  let start = startDay
  let end = endDay === null ? null : addDays(endDay, 1)
  if (startDay !== null && endDay !== null) {
    if (draft.allDay) {
      if (endDay < startDay) errors.date = 'Data końca nie może być przed początkiem'
    } else {
      const startTime = parseTime(draft.startTime)
      const endTime = parseTime(draft.endTime)
      if (startTime === null || endTime === null) {
        errors.time = 'Podaj godziny'
      } else {
        start = atTime(startDay, startTime)
        end = atTime(endDay, endTime)
        if (end <= start) errors.time = 'Koniec musi być po początku'
      }
    }
  }

  if (draft.repeat === 'weekdays' && draft.repeatDays.length === 0) errors.repeat = 'Wybierz dni tygodnia'
  else if (draft.repeat !== 'none' && draft.repeatUntil !== '') {
    const until = parseDate(draft.repeatUntil)
    if (until === null) errors.repeat = 'Podaj datę końca powtarzania'
    else if (startDay !== null && until < startDay) errors.repeat = 'Koniec powtarzania nie może być przed początkiem'
  }

  if (Object.keys(errors).length > 0 || start === null || end === null) return { ok: false, errors }

  const selected = members.filter((member) => draft.memberIds.includes(member.id)).map((member) => member.tag)
  const tags = [...new Set([...selected, ...typedTags, ...(draft.special === null ? [] : [draft.special]), ...(draft.work === null ? [] : [draft.work])])]
  const { [EVENT_TAGS_PROPERTY]: _previous, ...otherProperties } = existing?.extendedProperties?.private ?? {}
  const privateProperties = tags.length > 0 ? { ...otherProperties, [EVENT_TAGS_PROPERTY]: tags.join(',') } : otherProperties
  const description = draft.description.trim()
  const recurrence = recurrenceFromFields(draft)

  return {
    ok: true,
    input: {
      title,
      ...(description === '' ? {} : { description }),
      allDay: draft.allDay,
      start,
      end,
      ...(Object.keys(privateProperties).length === 0 ? {} : { extendedProperties: { private: privateProperties } }),
      ...(recurrence === null ? {} : { recurrence }),
    },
  }
}
