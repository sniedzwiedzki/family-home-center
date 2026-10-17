import type { FamilyMember } from '../family/familyMember'
import { extractTags, type TaggableEvent } from './tags'

export const OTHER_COLUMN_ID = 'other'
export const OTHER_COLUMN_NAME = 'Inne'

export interface CalendarColumn {
  id: string
  name: string
  color: string | null
  tag: string | null
}

export function buildColumns(members: readonly FamilyMember[]): CalendarColumn[] {
  const memberColumns = members.map(({ id, name, color, tag }) => ({ id, name, color, tag }))
  return [...memberColumns, { id: OTHER_COLUMN_ID, name: OTHER_COLUMN_NAME, color: null, tag: null }]
}

export function columnIdsForEvent(event: TaggableEvent, members: readonly FamilyMember[]): string[] {
  const tags = new Set(extractTags(event))
  const matching = members.filter((member) => tags.has(member.tag)).map((member) => member.id)
  return matching.length > 0 ? matching : [OTHER_COLUMN_ID]
}
