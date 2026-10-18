import type { CSSProperties } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { formatClock } from '../shared/format'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import { hourRange, MINUTES_PER_HOUR, placeSpans, timedSpans } from './dayHours'
import type { DayEntry } from './days'
import { EventItem } from './EventItem'
import type { CalendarEvent } from './types'

interface HourBodyProps {
  day: Date
  /** Draws the now-line when set: the day is today. */
  now?: Date
  columns: readonly CalendarColumn[]
  members: readonly FamilyMember[]
  entries: readonly DayEntry[]
  onAddEvent: (day: Date, columnId: string) => void
  onEditEvent: (event: CalendarEvent) => void
}

const hoursFrom = (startHour: number, minute: number): number => minute / MINUTES_PER_HOUR - startHour
const offset = (hours: number): string => `calc(var(--hour-height) * ${hours})`

/** The hour grid of an expanded day: an hour axis and, per column, the events at the hours they take place. */
export function HourBody({ day, now, columns, members, entries, onAddEvent, onEditEvent }: HourBodyProps) {
  const spans = timedSpans(day, entries)
  const { startHour, endHour } = hourRange(spans)
  const placed = spans.map((span) => ({ span, columnIds: columnIdsForEvent(span.entry.event, members) }))
  const nowHours = now === undefined ? null : hoursFrom(startHour, now.getHours() * MINUTES_PER_HOUR + now.getMinutes())
  const showNow = nowHours !== null && nowHours >= 0 && nowHours <= endHour - startHour

  return (
    <div className="hour-body day-grid" style={{ '--hours': endHour - startHour } as CSSProperties}>
      <div className="hour-labels">
        {Array.from({ length: endHour - startHour }, (_, index) => (
          <span key={index} className="hour-label" style={{ top: offset(index) }}>
            {startHour + index}:00
          </span>
        ))}
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className="day-cell hour-track"
          data-column={column.id}
          onClick={(click) => {
            click.stopPropagation()
            onAddEvent(day, column.id)
          }}
        >
          {placeSpans(placed.filter(({ columnIds }) => columnIds.includes(column.id)).map(({ span }) => span)).map((span) => (
            <EventItem
              key={span.entry.event.id}
              entry={span.entry}
              color={column.color}
              onEdit={onEditEvent}
              placement={{
                top: offset(hoursFrom(startHour, span.startMinute)),
                height: offset((span.endMinute - span.startMinute) / MINUTES_PER_HOUR),
                left: `${(span.lane / span.lanes) * 100}%`,
                width: `${100 / span.lanes}%`,
              }}
            />
          ))}
        </div>
      ))}
      {showNow && (
        <div className="now-line" style={{ top: offset(nowHours) }}>
          <span className="now-time">{formatClock(now!)}</span>
        </div>
      )}
    </div>
  )
}
