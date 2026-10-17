import type { FamilyMember } from '../family/familyMember'
import { formatWeekday } from '../shared/format'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import { dayKey, dayKind, type DayEntry } from './days'
import type { DayForecast } from '../weather/types'
import { DayWeather } from '../weather/DayWeather'
import { EventItem } from './EventItem'

interface DayRowProps {
  day: Date
  isToday: boolean
  pinned?: boolean
  columns: readonly CalendarColumn[]
  members: readonly FamilyMember[]
  entries: readonly DayEntry[]
  forecast?: DayForecast
}

export function DayRow({ day, isToday, pinned = false, columns, members, entries, forecast }: DayRowProps) {
  const placed = entries.map((entry) => ({ entry, columnIds: columnIdsForEvent(entry.event, members) }))

  const kind = dayKind(day)
  const classes = ['day-row', 'day-grid']
  if (kind !== 'weekday') classes.push(`is-${kind}`)
  if (isToday) classes.push('is-today')
  if (pinned) classes.push('is-pinned')

  return (
    <div className={classes.join(' ')} data-day={pinned ? undefined : dayKey(day)}>
      <div className="day-label">
        <div className="day-date">
          <span className="day-number">{day.getDate()}</span>
          <span className="day-weekday">{formatWeekday(day)}</span>
        </div>
        {forecast && <DayWeather forecast={forecast} />}
      </div>
      {columns.map((column) => (
        <div key={column.id} className="day-cell" data-column={column.id}>
          {placed
            .filter(({ columnIds }) => columnIds.includes(column.id))
            .map(({ entry }) => (
              <EventItem key={entry.event.id} entry={entry} color={column.color} />
            ))}
        </div>
      ))}
    </div>
  )
}
