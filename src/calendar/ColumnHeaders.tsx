import type { CalendarColumn } from './columns'
import { OTHER_COLUMN_ID } from './columns'

export function ColumnHeaders({ columns }: { columns: readonly CalendarColumn[] }) {
  return (
    <div className="column-headers day-grid">
      <div />
      {columns.map((column) => (
        <div
          key={column.id}
          className="column-header"
          data-column={column.id === OTHER_COLUMN_ID ? 'other' : 'member'}
          style={column.color === null ? undefined : { borderBottomColor: column.color }}
        >
          {column.name}
        </div>
      ))}
    </div>
  )
}
