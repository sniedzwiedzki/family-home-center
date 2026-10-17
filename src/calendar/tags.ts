import { normalizeTag } from '../family/familyMember'

export const EVENT_TAGS_PROPERTY = 'fhcTags'

export interface TaggableEvent {
  title: string
  extendedProperties?: { private?: Record<string, string> }
}

const TITLE_TAG_PATTERN = /#([\p{L}\p{N}_-]+)/gu

export function extractTags(event: TaggableEvent): string[] {
  const stored = event.extendedProperties?.private?.[EVENT_TAGS_PROPERTY] ?? ''
  const fromProperty = stored.split(',')
  const fromTitle = [...event.title.matchAll(TITLE_TAG_PATTERN)].map((match) => match[1])
  const tags = [...fromProperty, ...fromTitle].map(normalizeTag).filter((tag) => tag !== '')
  return [...new Set(tags)]
}

export const stripTitleTags = (title: string): string => title.replace(TITLE_TAG_PATTERN, '').replace(/\s+/g, ' ').trim()
