import type { Recurrence } from './types'

export type RepeatKind = 'none' | 'weekly' | 'weekdays' | 'monthly' | 'yearly'

/** What the editor form holds about repeating. */
export interface RepeatFields {
  repeat: RepeatKind
  /** 0 = Sunday ... 6 = Saturday; used by `weekdays`. */
  repeatDays: number[]
  /** `YYYY-MM-DD`, empty for no end. */
  repeatUntil: string
}

export const NO_REPEAT: RepeatFields = { repeat: 'none', repeatDays: [], repeatUntil: '' }

export const REPEAT_LABELS: Record<RepeatKind, string> = {
  none: 'Nie powtarzaj',
  weekly: 'Co tydzień',
  weekdays: 'Co tydzień w wybrane dni',
  monthly: 'Co miesiąc tego dnia',
  yearly: 'Co rok tego dnia',
}

/** Monday first, as in the Polish week; the number is `Date.getDay()`. */
export const WEEKDAYS: readonly { day: number; label: string }[] = [
  { day: 1, label: 'Pn' },
  { day: 2, label: 'Wt' },
  { day: 3, label: 'Śr' },
  { day: 4, label: 'Cz' },
  { day: 5, label: 'Pt' },
  { day: 6, label: 'So' },
  { day: 0, label: 'Nd' },
]

export function recurrenceFromFields({ repeat, repeatDays, repeatUntil }: RepeatFields): Recurrence | null {
  if (repeat === 'none') return null
  const until = repeatUntil === '' ? null : repeatUntil
  if (repeat === 'weekdays') return { frequency: 'weekly', weekdays: [...repeatDays].sort(), until }
  return { frequency: repeat, weekdays: [], until }
}

export function fieldsFromRecurrence(recurrence: Recurrence): RepeatFields {
  const repeatUntil = recurrence.until ?? ''
  if (recurrence.frequency === 'weekly') {
    return recurrence.weekdays.length === 0
      ? { repeat: 'weekly', repeatDays: [], repeatUntil }
      : { repeat: 'weekdays', repeatDays: recurrence.weekdays, repeatUntil }
  }
  return { repeat: recurrence.frequency, repeatDays: [], repeatUntil }
}
