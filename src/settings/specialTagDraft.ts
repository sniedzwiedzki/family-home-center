import { normalizeTag, tagSchema } from '../family/familyMember'
import { TAG_ERROR } from '../family/memberErrors'

export const SPECIAL_TAG_DUPLICATE_ERROR = 'Tag nie może być taki sam jak tag osoby'

/** The special tag follows the rules of a person's tag and must not be one of them. */
export function specialTagError(draft: string, memberTags: readonly string[]): string | null {
  if (!tagSchema.safeParse(draft).success) return TAG_ERROR
  return memberTags.map(normalizeTag).includes(normalizeTag(draft)) ? SPECIAL_TAG_DUPLICATE_ERROR : null
}
