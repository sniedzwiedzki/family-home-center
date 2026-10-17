import { familyMembersSchema } from './familyMember'

export interface MemberErrors {
  name?: string
  tag?: string
  color?: string
}

export interface DraftMember {
  id: string
  name: string
  tag: string
  color: string
}

const NAME_ERROR = 'Podaj imię (do 30 znaków)'
const TAG_ERROR = 'Tag: litery, cyfry, _ lub - (do 20 znaków)'
const TAG_DUPLICATE_ERROR = 'Tag musi być unikalny'
const COLOR_ERROR = 'Wybierz kolor'

const messageFor = (field: string, code: string): string =>
  field === 'name' ? NAME_ERROR : field === 'tag' ? (code === 'custom' ? TAG_DUPLICATE_ERROR : TAG_ERROR) : COLOR_ERROR

/** One entry per draft member; the first problem found for a field wins. */
export function memberErrors(draft: readonly DraftMember[]): MemberErrors[] {
  const errors: MemberErrors[] = draft.map(() => ({}))
  const result = familyMembersSchema.safeParse(draft)
  if (result.success) return errors
  for (const issue of result.error.issues) {
    const [index, field] = issue.path as [number, 'name' | 'tag' | 'color']
    errors[index][field] ??= messageFor(field, issue.code)
  }
  return errors
}

export const hasErrors = (errors: readonly MemberErrors[]): boolean => errors.some((error) => Object.keys(error).length > 0)
