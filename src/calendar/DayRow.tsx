import type { FamilyMember } from '../family/familyMember'
import { formatWeekday } from '../shared/format'
import { chipColors, type CalendarColumn } from './columns'
import { layoutDayEntries } from './dayLayout'
import { dayKey, dayKind, type DayEntry } from './days'
import type { DayForecast, HourForecast } from '../weather/types'
import { DayWeather } from '../weather/DayWeather'
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
  /** The column each event goes to. */
  columnOf: (event: CalendarEvent) => string
  entries: readonly DayEntry[]
  forecast?: DayForecast
  /** Left out, the day is compact and cannot be expanded: the pinned copy of today. */
  expansion?: DayExpansion
  onAddEvent: (day: Date, columnId: string, hour?: number) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function DayRow({ day, isToday, pinned = false, columns, members, columnOf, entries, forecast, expansion, onAddEvent, onEditEvent }: DayRowProps) {
  const expanded = expansion?.expanded === true
  // An expanded day draws its timed events on the hour grid; the row above keeps the all-day ones.
  const cells = layoutDayEntries(
    entries.filter((entry) => !expanded || !isTimed(entry)),
    columns,
    columnOf,
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
          </button>
        )}
        {forecast && <DayWeather forecast={forecast} />}
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className="day-cell"
          data-column={column.id}
          onClick={(click) => {
            click.stopPropagation()
            onAddEvent(day, column.id)
          }}
        >
          {cells.get(column.id)!.map((entry) => (
            <EventItem key={entry.event.id} entry={entry} {...chipColors(entry.event, members)} onEdit={onEditEvent} />
          ))}
        </div>
      ))}
      {expansion?.expanded && (
        <HourBody
          day={day}
          now={isToday ? expansion.now : undefined}
          columns={columns}
          members={members}
          columnOf={columnOf}
          entries={entries}
          hourForecasts={expansion.hourForecasts}
          onAddEvent={onAddEvent}
          onEditEvent={onEditEvent}
        />
      )}
    </div>
  )
}
