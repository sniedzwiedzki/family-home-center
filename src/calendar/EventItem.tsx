import { formatClock } from '../shared/format'
import { stripTitleTags } from './tags'
import type { DayEntry } from './days'

function timeLabel({ event, isContinuation }: DayEntry): string {
  if (isContinuation) return 'ciąg dalszy'
  if (event.allDay) return 'cały dzień'
  return `${formatClock(event.start)}–${formatClock(event.end)}`
}

export function EventItem({ entry, color }: { entry: DayEntry; color: string | null }) {
  return (
    <div className="event" style={color === null ? undefined : ({ '--event-color': color } as React.CSSProperties)}>
      <span className="event-time">{timeLabel(entry)}</span>
      <span className="event-title">{stripTitleTags(entry.event.title)}</span>
    </div>
  )
}
