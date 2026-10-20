import type { CSSProperties } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { formatClock } from '../shared/format'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import { hourRange, LEADING_HOURS, MINUTES_PER_HOUR, placeSpans, timedSpans } from './dayHours'
import type { DayEntry } from './days'
import { EventItem } from './EventItem'
import { describeWeather } from '../weather/weatherCodes'
import type { HourForecast } from '../weather/types'
import type { CalendarEvent } from './types'

interface HourBodyProps {
  day: Date
  /** Draws the now-line when set: the day is today. */
  now?: Date
  columns: readonly CalendarColumn[]
  members: readonly FamilyMember[]
  entries: readonly DayEntry[]
  /** Forecast by hour start (ms); shown left of each hour. */
  hourForecasts: ReadonlyMap<number, HourForecast>
  /** `hour` is the whole hour that was clicked. */
  onAddEvent: (day: Date, columnId: string, hour: number) => void
  onEditEvent: (event: CalendarEvent) => void
}

/** Position on the grid in hours from its top, which lies `LEADING_HOURS` before `startHour`. */
const hoursFrom = (startHour: number, minute: number): number => minute / MINUTES_PER_HOUR - startHour + LEADING_HOURS
const offset = (hours: number): string => `calc(var(--hour-height) * ${hours})`

/** The hour grid of an expanded day: an hour axis and, per column, the events at the hours they take place. */
export function HourBody({ day, now, columns, members, entries, hourForecasts, onAddEvent, onEditEvent }: HourBodyProps) {
  const spans = timedSpans(day, entries)
  const { startHour, endHour } = hourRange(spans)
  const placed = spans.map((span) => ({ span, columnIds: columnIdsForEvent(span.entry.event, members) }))
  const nowHours = now === undefined ? null : hoursFrom(startHour, now.getHours() * MINUTES_PER_HOUR + now.getMinutes())
  const showNow = nowHours !== null && nowHours >= LEADING_HOURS && nowHours <= endHour - startHour + LEADING_HOURS

  return (
    <div className="hour-body day-grid" style={{ '--hours': endHour - startHour + LEADING_HOURS } as CSSProperties}>
      <div className="hour-labels">
        {Array.from({ length: endHour - startHour }, (_, index) => (
          <span key={index} className="hour-label" style={{ top: offset(index + LEADING_HOURS) }}>
            {startHour + index}:00
          </span>
        ))}
        {Array.from({ length: endHour - startHour }, (_, index) => startHour + index)
          .map((hour) => ({ hour, forecast: hourForecasts.get(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour).getTime()) }))
          .map(({ hour, forecast }) =>
            forecast === undefined ? null : (
              <span key={hour} className="hour-weather" style={{ top: offset(hour - startHour + LEADING_HOURS) }} title={describeWeather(forecast.code).label}>
                <span className="hour-weather-icon">{describeWeather(forecast.code).icon}</span>
                {`${Math.round(forecast.temp)}°`}
              </span>
            ),
          )}
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className="day-cell hour-track"
          data-column={column.id}
          onClick={(click) => {
            click.stopPropagation()
            const { top, height } = click.currentTarget.getBoundingClientRect()
            const hour = startHour + Math.floor(((click.clientY - top) / height) * (endHour - startHour + LEADING_HOURS) - LEADING_HOURS)
            onAddEvent(day, column.id, Math.min(Math.max(hour, startHour), endHour - 1))
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
