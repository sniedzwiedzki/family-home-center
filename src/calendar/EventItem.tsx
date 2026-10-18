import type { CSSProperties } from 'react'
import { formatClock } from '../shared/format'
import { stripTitleTags } from './tags'
import type { DayEntry } from './days'
import type { CalendarEvent } from './types'

function timeLabel({ event, isContinuation }: DayEntry): string {
  if (isContinuation) return 'ciąg dalszy'
  if (event.allDay) return 'cały dzień'
  return `${formatClock(event.start)}–${formatClock(event.end)}`
}

/** CSS positions of an event drawn on the hour grid. */
export interface EventPlacement {
  top: string
  height: string
  left: string
  width: string
}

interface EventItemProps {
  entry: DayEntry
  color: string | null
  placement?: EventPlacement
  onEdit: (event: CalendarEvent) => void
}

export function EventItem({ entry, color, placement, onEdit }: EventItemProps) {
  return (
    <button
      type="button"
      className={placement === undefined ? 'event' : 'event is-timed'}
      style={{ ...(color === null ? {} : { '--event-color': color }), ...placement } as CSSProperties}
      onClick={(click) => {
        click.stopPropagation()
        onEdit(entry.event)
      }}
    >
      <span className="event-time">{timeLabel(entry)}</span>
      <span className="event-title">{stripTitleTags(entry.event.title)}</span>
    </button>
  )
}
