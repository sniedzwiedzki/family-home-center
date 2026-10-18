import type { CSSProperties } from 'react'
import type { CalendarColumn } from './columns'
import { OTHER_COLUMN_ID } from './columns'
import { HomeIcon } from '../shell/icons'

const OTHER_INITIAL = '…'

export const HOME_LABEL = 'Wróć do widoku początkowego'

interface ColumnHeadersProps {
  columns: readonly CalendarColumn[]
  onHome: () => void
}

export function ColumnHeaders({ columns, onHome }: ColumnHeadersProps) {
  return (
    <div className="column-headers day-grid">
      <div className="home-slot">
        <button type="button" className="home-button" aria-label={HOME_LABEL} onClick={onHome}>
          <HomeIcon />
        </button>
      </div>
      {columns.map((column) => (
        <div
          key={column.id}
          className="column-header"
          data-column={column.id === OTHER_COLUMN_ID ? 'other' : 'member'}
          style={column.color === null ? undefined : ({ '--person-color': column.color } as CSSProperties)}
        >
          <span className="avatar" aria-hidden="true">
            {column.id === OTHER_COLUMN_ID ? OTHER_INITIAL : column.name.charAt(0).toUpperCase()}
          </span>
          <span className="column-name">{column.name}</span>
        </div>
      ))}
    </div>
  )
}
