import { useContext, type CSSProperties } from 'react'
import { formatClock } from '../shared/format'
import { isSpecialEvent, SpecialTagContext } from './specialTag'
import { stripTitleTags } from './tags'
import { hasTimeLine } from './dayLayout'
import type { DayEntry } from './days'
import type { CalendarEvent } from './types'

/** An all-day event shows only its title, so it has no time line. */
function timeLabel(entry: DayEntry): string | null {
  if (!hasTimeLine(entry)) return null
  return entry.isContinuation ? 'ciąg dalszy' : `${formatClock(entry.event.start)}–${formatClock(entry.event.end)}`
}

/** How much of a person's colour goes into a chip's fill and into its border; the rest is white. */
const FILL_PERCENT = 28
const BORDER_PERCENT = 50

const pastel = (color: string, percent: number): string => `color-mix(in srgb, ${color} ${percent}%, white)`

/** One equal stripe per person, for both the fill and the border, so it looks like the other chips. */
function stripes(colors: readonly string[], percent: number): string {
  const stops = colors.map((color, index) => `${pastel(color, percent)} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`)
  // 135deg runs down to the right, so the borders between the colours are slanted lines at 45 degrees, like "/".
  return `linear-gradient(135deg, ${stops.join(', ')})`
}

const sharedBackground = (colors: readonly string[]): string =>
  `${stripes(colors, FILL_PERCENT)} padding-box, ${stripes(colors, BORDER_PERCENT)} border-box`

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
  /** The colours of all the people taking part, when the event belongs to several of them. */
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
      style={{ ...(color === null ? {} : { '--event-color': color }), ...(sharedColors === undefined ? {} : { background: sharedBackground(sharedColors) }), ...placement } as CSSProperties}
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
