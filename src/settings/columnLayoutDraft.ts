import { columnLayoutSchema, type ColumnLayout } from '../calendar/columns'

/** The column settings as typed in the form: widths as text until they are saved. */
export interface ColumnLayoutDraft {
  all: string
  recurring: string
  work: string
  other: string
  workTag: string
}

export const draftFromColumnLayout = ({ widths, workTag }: ColumnLayout): ColumnLayoutDraft => ({
  all: String(widths.all),
  recurring: String(widths.recurring),
  work: String(widths.work),
  other: String(widths.other),
  workTag,
})

/** The layout of the draft, or null while a field is not valid. */
export function columnLayoutFromDraft(draft: ColumnLayoutDraft): ColumnLayout | null {
  const parsed = columnLayoutSchema.safeParse({
    widths: { all: Number(draft.all), recurring: Number(draft.recurring), work: Number(draft.work), other: Number(draft.other) },
    workTag: draft.workTag,
  })
  return parsed.success ? parsed.data : null
}
