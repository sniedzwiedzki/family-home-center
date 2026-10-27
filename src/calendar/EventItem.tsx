import { useContext, type CSSProperties, type Ref } from 'react'
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

interface EventSpacerProps {
  hasTimeLine: boolean
  isLast: boolean
  /** The measured width of the chip, in px: the last spacer then covers only the part of the chip in its column. */
  chipWidth?: number
}

/**
 * An invisible box as tall as a chip with (or without) a time line. It keeps the height of an event shown across several
 * columns free in the other columns, and gives that event's band its height. In the last column the band ends half way,
 * so the spacer covers at most that half.
 */
export function EventSpacer({ hasTimeLine, isLast, chipWidth }: EventSpacerProps) {
  return (
    <div
      className={isLast ? 'event-spacer is-end' : 'event-spacer'}
      style={chipWidth === undefined ? undefined : ({ '--chip-width': `${chipWidth}px` } as CSSProperties)}
      aria-hidden="true"
    >
      {hasTimeLine && <span className="spacer-time">&nbsp;</span>}
      <span className="spacer-title">&nbsp;</span>
    </div>
  )
}

/** One equal stripe per person, for both the fill and the border, so it looks like the other chips. */
function stripes(colors: readonly string[], percent: number): string {
  const stops = colors.map((color, index) => `${pastel(color, percent)} ${(index / colors.length) * 100}% ${((index + 1) / colors.length) * 100}%`)
  return `linear-gradient(to right, ${stops.join(', ')})`
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
  /** The colours of all the people taking part, when the event is drawn once across their columns. */
  sharedColors?: readonly string[]
  onEdit: (event: CalendarEvent) => void
  ref?: Ref<HTMLButtonElement>
}

export function EventItem({ entry, color, placement, sharedColors, onEdit, ref }: EventItemProps) {
  const time = timeLabel(entry)
  const isSpecial = isSpecialEvent(entry.event, useContext(SpecialTagContext))
  const classes = ['event']
  if (placement !== undefined) classes.push('is-timed')
  if (sharedColors !== undefined) classes.push('is-shared')

  return (
    <button
      ref={ref}
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
