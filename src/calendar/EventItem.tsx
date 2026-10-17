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

interface EventItemProps {
  entry: DayEntry
  color: string | null
  onEdit: (event: CalendarEvent) => void
}

export function EventItem({ entry, color, onEdit }: EventItemProps) {
  return (
    <button
      type="button"
      className="event"
      style={color === null ? undefined : ({ '--event-color': color } as CSSProperties)}
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
