import type { CSSProperties } from 'react'
import type { FamilyMember } from '../family/familyMember'
import { HomeIcon } from '../shell/icons'

export const HOME_LABEL = 'Wróć do widoku początkowego'

interface ColumnHeadersProps {
  members: readonly FamilyMember[]
  onHome: () => void
}

/** The home button and, on the right, a legend of the family members' colours. */
export function ColumnHeaders({ members, onHome }: ColumnHeadersProps) {
  return (
    <div className="column-headers legend-bar">
      <div className="home-slot">
        <button type="button" className="home-button" aria-label={HOME_LABEL} onClick={onHome}>
          <HomeIcon />
        </button>
      </div>
      <div className="legend">
        {members.map((member) => (
          <div key={member.id} className="column-header" style={{ '--person-color': member.color } as CSSProperties}>
            <span className="avatar" aria-hidden="true">
              {member.name.charAt(0).toUpperCase()}
            </span>
            <span className="column-name">{member.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
