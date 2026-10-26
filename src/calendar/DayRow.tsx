import type { FamilyMember } from '../family/familyMember'
import { formatWeekday } from '../shared/format'
import type { CalendarColumn } from './columns'
import { layoutDayEntries } from './dayLayout'
import { dayKey, dayKind, type DayEntry } from './days'
import type { DayForecast, HourForecast } from '../weather/types'
import { DayWeather } from '../weather/DayWeather'
import { ChevronIcon } from '../shell/icons'
import { isTimed } from './dayHours'
import { EventItem } from './EventItem'
import { HourBody } from './HourBody'
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
  // An expanded day draws its timed events on the hour grid; the row above keeps the all-day ones.
  const { bands, laneCount, cellEntries } = layoutDayEntries(
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
      <div className="day-label" style={{ gridRow: `1 / span ${laneCount + 1}` }}>
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
      {bands.map((band) => (
        <div
          key={`${band.entry.event.id}-${band.firstColumn}`}
          className="day-band"
          style={{ gridRow: band.lane + 1, gridColumn: `${band.firstColumn + 2} / span ${band.columnCount}` }}
        >
          <EventItem
            entry={band.entry}
            color={null}
            sharedColors={columns.slice(band.firstColumn, band.firstColumn + band.columnCount).map((column) => column.color!)}
            onEdit={onEditEvent}
          />
        </div>
      ))}
      {columns.map((column) => (
        <div
          key={column.id}
          className="day-cell"
          data-column={column.id}
          style={{ gridRow: laneCount + 1 }}
          onClick={(click) => {
            click.stopPropagation()
            onAddEvent(day, column.id)
          }}
        >
          {cellEntries.get(column.id)!.map((entry) => (
            <EventItem key={entry.event.id} entry={entry} color={column.color} onEdit={onEditEvent} />
          ))}
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
