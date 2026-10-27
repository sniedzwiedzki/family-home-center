import type { CSSProperties } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { formatWeekday } from '../shared/format'
import type { CalendarColumn } from './columns'
import { layoutDayEntries } from './dayLayout'
import { dayKey, dayKind, type DayEntry } from './days'
import type { DayForecast, HourForecast } from '../weather/types'
import { DayWeather } from '../weather/DayWeather'
import { ChevronIcon } from '../shell/icons'
import { isTimed } from './dayHours'
import { EventItem, EventSpacer } from './EventItem'
import { HourBody } from './HourBody'
import { useElementWidths } from './useElementWidths'
import type { CalendarEvent } from './types'

export interface DayExpansion {
  expanded: boolean
  /** Moves the now-line of an expanded today. */
  now: Date
  hourForecasts: ReadonlyMap<number, HourForecast>
  onToggle: () => void
}

interface DayRowProps {
  day: Date
  isToday: boolean
  pinned?: boolean
  columns: readonly CalendarColumn[]
  members: readonly FamilyMember[]
  entries: readonly DayEntry[]
  forecast?: DayForecast
  /** Left out, the day is compact and cannot be expanded: the pinned copy of today. */
  expansion?: DayExpansion
  onAddEvent: (day: Date, columnId: string, hour?: number) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function DayRow({ day, isToday, pinned = false, columns, members, entries, forecast, expansion, onAddEvent, onEditEvent }: DayRowProps) {
  const expanded = expansion?.expanded === true
  // A two-person chip is only as wide as its text, so the last person's spacer is sized from the measured chip.
  const [chipWidths, chipWidthRef] = useElementWidths()
  // An expanded day draws its timed events on the hour grid; the row above keeps the all-day ones.
  const cellItems = layoutDayEntries(
    entries.filter((entry) => !expanded || !isTimed(entry)),
    columns,
    members,
  )

  const kind = dayKind(day)
  const classes = ['day-row', 'day-grid']
  if (kind !== 'weekday') classes.push(`is-${kind}`)
  if (isToday) classes.push('is-today')
  if (pinned) classes.push('is-pinned')
  if (expanded) classes.push('is-expanded')

  const dateText = (
    <>
      <span className="day-number">{day.getDate()}</span>
      <span className="day-weekday">{formatWeekday(day)}</span>
    </>
  )

  return (
    <div className={classes.join(' ')} data-day={pinned ? undefined : dayKey(day)}>
      <div className="day-label">
        {expansion === undefined ? (
          <div className="day-date">{dateText}</div>
        ) : (
          <button type="button" className="day-date" aria-expanded={expanded} onClick={expansion.onToggle}>
            {dateText}
            <span className="day-chevron">
              <ChevronIcon />
            </span>
          </button>
        )}
        {forecast && <DayWeather forecast={forecast} />}
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className={cellItems.get(column.id)!.some((item) => item.kind !== 'entry') ? 'day-cell has-band' : 'day-cell'}
          data-column={column.id}
          onClick={(click) => {
            click.stopPropagation()
            onAddEvent(day, column.id)
          }}
        >
          {cellItems.get(column.id)!.map((item) => {
            if (item.kind === 'spacer')
              return (
                <EventSpacer
                  key={`spacer-${item.entry.event.id}`}
                  hasTimeLine={item.hasTimeLine}
                  isLast={item.isLast}
                  chipWidth={chipWidths.get(item.entry.event.id)}
                />
              )
            if (item.kind === 'entry') return <EventItem key={`entry-${item.entry.event.id}`} entry={item.entry} color={column.color} onEdit={onEditEvent} />
            // The band reserves the space over the columns. The chip inside of two people is only as wide as its text needs
            // (and may grow into the outer halves when nothing else shares those columns); with more people it fills the band,
            // so it still reaches every one of their columns.
            const chipWidth = chipWidths.get(item.entry.event.id)
            return (
              <div
                key={`shared-${item.entry.event.id}`}
                className={['event-band', ...(item.colors.length > 2 ? ['is-wide'] : []), ...(item.canWiden ? ['can-widen'] : [])].join(' ')}
                style={{ '--span': item.colors.length, ...(chipWidth === undefined ? {} : { '--chip-width': `${chipWidth}px` }) } as CSSProperties}
              >
                <EventSpacer hasTimeLine={item.hasTimeLine} isLast={false} />
                <EventItem
                  ref={item.colors.length > 2 ? undefined : chipWidthRef(item.entry.event.id)}
                  entry={item.entry}
                  color={null}
                  sharedColors={item.colors}
                  onEdit={onEditEvent}
                />
              </div>
            )
          })}
        </div>
      ))}
      {expansion?.expanded && (
        <HourBody
          day={day}
          now={isToday ? expansion.now : undefined}
          columns={columns}
          members={members}
          entries={entries}
          hourForecasts={expansion.hourForecasts}
          onAddEvent={onAddEvent}
          onEditEvent={onEditEvent}
        />
      )}
    </div>
  )
}
