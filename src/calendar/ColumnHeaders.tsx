import type { FamilyMember } from '../family/familyMember'
import { buildColumns, OTHER_COLUMN_ID } from './columns'

export function ColumnHeaders({ members }: { members: readonly FamilyMember[] }) {
  const columns = buildColumns(members)

  return (
    <div className="column-headers" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
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
