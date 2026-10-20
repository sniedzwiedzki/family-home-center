import { dayKey } from '../calendar/days'
import type { Recurrence, SeriesRule } from '../calendar/types'

const RULE_PREFIX = 'RRULE:'
/** Index is `Date.getDay()`. */
const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA']
const FREQUENCIES = { WEEKLY: 'weekly', MONTHLY: 'monthly', YEARLY: 'yearly' } as const
const END_OF_DAY_HOUR = 23
const END_OF_DAY_MINUTE = 59
const END_OF_DAY_SECOND = 59

const pad = (value: number) => String(value).padStart(2, '0')

export const isRuleLine = (line: string): boolean => line.startsWith(RULE_PREFIX)

/** `UNTIL`: a date for all-day events; for timed ones the end of that day as a UTC time, which iCalendar requires when the event has a time zone. */
function untilValue(until: string, allDay: boolean): string {
  const [year, month, day] = until.split('-').map(Number)
  if (allDay) return `${year}${pad(month)}${pad(day)}`
  const end = new Date(year, month - 1, day, END_OF_DAY_HOUR, END_OF_DAY_MINUTE, END_OF_DAY_SECOND)
  return end.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

/** The Google `RRULE` line for a recurrence. */
export function toRuleLine({ frequency, weekdays, until }: Recurrence, allDay: boolean): string {
  const parts = [`FREQ=${frequency.toUpperCase()}`]
  if (frequency === 'weekly' && weekdays.length > 0) parts.push(`BYDAY=${weekdays.map((day) => DAY_CODES[day]).join(',')}`)
  if (until !== null) parts.push(`UNTIL=${untilValue(until, allDay)}`)
  return `${RULE_PREFIX}${parts.join(';')}`
}

function untilToDay(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z)?$/.exec(value)
  if (match === null) return null
  const [, year, month, day, hour, minute, second] = match
  // A UTC time is shown as the local day it falls on.
  return dayKey(
    hour === undefined
      ? new Date(Number(year), Number(month) - 1, Number(day))
      : new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second))),
  )
}

/** Reads a rule line the app could have written; null for anything else (an interval, a count, ...). */
function parseRuleLine(line: string): Recurrence | null {
  const entries = line.slice(RULE_PREFIX.length).split(';').map((part) => part.split('='))
  if (entries.some((entry) => entry.length !== 2)) return null
  const values = new Map(entries as [string, string][])
  if (values.size !== entries.length) return null
  const frequency = FREQUENCIES[values.get('FREQ') as keyof typeof FREQUENCIES]
  if (frequency === undefined) return null
  const allowed = frequency === 'weekly' ? ['FREQ', 'BYDAY', 'UNTIL'] : ['FREQ', 'UNTIL']
  if ([...values.keys()].some((key) => !allowed.includes(key))) return null

  const codes = values.get('BYDAY')?.split(',') ?? []
  const weekdays = codes.map((code) => DAY_CODES.indexOf(code))
  if (weekdays.includes(-1)) return null

  const untilText = values.get('UNTIL')
  const until = untilText === undefined ? null : untilToDay(untilText)
  if (untilText !== undefined && until === null) return null
  return { frequency, weekdays, until }
}

/** The rule of a series from the `recurrence` lines of its Google event. Other lines (`EXDATE`, `RDATE`) do not matter here. */
export function parseRuleLines(lines: readonly string[]): SeriesRule {
  const rules = lines.filter(isRuleLine)
  return (rules.length === 1 ? parseRuleLine(rules[0]) : null) ?? 'custom'
}
