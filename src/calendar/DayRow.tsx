import type { FamilyMember } from '../family/familyMember'
import { formatDayLabel } from '../shared/format'
import { columnIdsForEvent, type CalendarColumn } from './columns'
import { dayKey, type DayEntry } from './days'
import type { DayForecast } from '../weather/types'
import { DayWeather } from '../weather/DayWeather'
import { EventItem } from './EventItem'

interface DayRowProps {
  day: Date
  isToday: boolean
  columns: readonly CalendarColumn[]
  members: readonly FamilyMember[]
  entries: readonly DayEntry[]
  forecast?: DayForecast
}

export function DayRow({ day, isToday, columns, members, entries, forecast }: DayRowProps) {
  const placed = entries.map((entry) => ({ entry, columnIds: columnIdsForEvent(entry.event, members) }))

  return (
    <div className={isToday ? 'day-row day-grid is-today' : 'day-row day-grid'} data-day={dayKey(day)}>
      <div className="day-label">
        <div>{formatDayLabel(day)}</div>
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
