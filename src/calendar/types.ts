import type { TaggableEvent } from './tags'

export interface CalendarEvent extends TaggableEvent {
  id: string
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

export type CalendarEventInput = Omit<CalendarEvent, 'id'>

export interface CalendarPort {
  listEvents(range: DateRange): Promise<CalendarEvent[]>
  createEvent(input: CalendarEventInput): Promise<CalendarEvent>
  updateEvent(event: CalendarEvent): Promise<void>
  deleteEvent(id: string): Promise<void>
}
