import { useContext, type CSSProperties } from 'react'
import { formatClock } from '../shared/format'
import { isSpecialEvent, SpecialTagContext } from './specialTag'
import { stripTitleTags } from './tags'
import type { DayEntry } from './days'
import type { CalendarEvent } from './types'

/** An all-day event shows only its title, so it has no time line. */
function timeLabel({ event, isContinuation }: DayEntry): string | null {
  if (isContinuation) return 'ciąg dalszy'
  if (event.allDay) return null
  return `${formatClock(event.start)}–${formatClock(event.end)}`
}

const pastel = (color: string): string => `color-mix(in srgb, ${color} 28%, white)`

/** One equal stripe per person, so the chip lines up with the columns it spans. */
function stripes(colors: readonly string[]): string {
  const stops = colors.map((color, index) => `${pastel(color)} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`)
  return `linear-gradient(to right, ${stops.join(', ')})`
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
  /** The colours of all the people taking part, when the event is drawn once across their columns. */
  sharedColors?: readonly string[]
  onEdit: (event: CalendarEvent) => void
}

export function EventItem({ entry, color, placement, sharedColors, onEdit }: EventItemProps) {
  const time = timeLabel(entry)
  const isSpecial = isSpecialEvent(entry.event, useContext(SpecialTagContext))
  const classes = ['event']
  if (placement !== undefined) classes.push('is-timed')
  if (sharedColors !== undefined) classes.push('is-shared')

  return (
    <button
      type="button"
      className={classes.join(' ')}
      style={{ ...(color === null ? {} : { '--event-color': color }), ...(sharedColors === undefined ? {} : { background: stripes(sharedColors) }), ...placement } as CSSProperties}
      onClick={(click) => {
        click.stopPropagation()
        onEdit(entry.event)
      }}
    >
      {time !== null && <span className="event-time">{time}</span>}
      <span className="event-title">
        {isSpecial && (
          <span className="event-star" role="img" aria-label="Wydarzenie specjalne">
            ★
          </span>
        )}
        {stripTitleTags(entry.event.title)}
      </span>
    </button>
  )
}
