import type { TaggableEvent } from './tags'

export interface CalendarEvent extends TaggableEvent {
  id: string
  /** Set on an occurrence of a recurring event: the id of the series it belongs to. */
  recurringEventId?: string
  description?: string
  allDay: boolean
  /** Local start. For all-day events, local midnight of the first day. */
  start: Date
  /** Exclusive end, as in Google Calendar. For all-day events, local midnight after the last day. */
  end: Date
}

export interface DateRange {
  from: Date
  /** Exclusive. */
  to: Date
}

/** How an event repeats. Only Google Calendar supports it. */
export interface Recurrence {
  frequency: 'weekly' | 'monthly' | 'yearly'
  /** Weekly only: 0 = Sunday ... 6 = Saturday. Empty means the weekday of the start. */
  weekdays: number[]
  /** The last day, `YYYY-MM-DD`; null repeats without end. */
  until: string | null
}

export type CalendarEventInput = Omit<CalendarEvent, 'id'> & {
  /** Makes a new event repeat. */
  recurrence?: Recurrence
}

/** The rule of a series: the part the app models, or `'custom'` for a rule it does not (it is then left untouched). */
export type SeriesRule = Recurrence | 'custom'

/** Reading and changing the whole series an occurrence belongs to. */
export interface SeriesPort {
  loadRule(occurrence: CalendarEvent): Promise<SeriesRule>
  /** Applies title, description, people, times and rule to the series; its start date stays. `keepRule` leaves the rule as it is. */
  update(occurrence: CalendarEvent, input: CalendarEventInput, keepRule: boolean): Promise<void>
}

/** What a change to a recurring event applies to; deleting can target the whole series. */
export type RecurrenceScope = 'occurrence' | 'series'

export interface CalendarPort {
  listEvents(range: DateRange): Promise<CalendarEvent[]>
  createEvent(input: CalendarEventInput): Promise<CalendarEvent>
  /** `recurrence` makes a single event repeat; it is not used for an occurrence of a series. */
  updateEvent(event: CalendarEvent, recurrence?: Recurrence): Promise<void>
  deleteEvent(event: CalendarEvent, scope: RecurrenceScope): Promise<void>
  /** Present only when events can repeat (Google Calendar); it also decides whether the editor offers repeating. */
  series?: SeriesPort
}
