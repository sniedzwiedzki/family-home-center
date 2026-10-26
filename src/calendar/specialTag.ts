import { createContext } from 'react'
import { extractTags, type TaggableEvent } from './tags'

export const DEFAULT_SPECIAL_TAG = 'star'

/** The tag that marks an event as special (shown with a gold star); set in the settings. */
export const SpecialTagContext = createContext(DEFAULT_SPECIAL_TAG)

export const isSpecialEvent = (event: TaggableEvent, specialTag: string): boolean => extractTags(event).includes(specialTag)
