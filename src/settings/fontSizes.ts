import { z } from 'zod'

/** 1rem is 16 px on the 1600 px wide kiosk display, so sizes typed in the settings are px of that display. */
export const PX_PER_REM = 16
export const FONT_SIZE_MIN_PX = 8
export const FONT_SIZE_MAX_PX = 120

const fontSizePx = z.number().int().min(FONT_SIZE_MIN_PX).max(FONT_SIZE_MAX_PX)

export const fontSizesSchema = z.object({
  eventTitle: fontSizePx,
  eventTime: fontSizePx,
  dayNumber: fontSizePx,
})

export type FontSizes = z.infer<typeof fontSizesSchema>

export const DEFAULT_FONT_SIZES: FontSizes = { eventTitle: 20, eventTime: 16, dayNumber: 41 }

export interface FontSizesDraft {
  eventTitle: string
  eventTime: string
  dayNumber: string
}

export const draftFromFontSizes = (sizes: FontSizes): FontSizesDraft => ({
  eventTitle: String(sizes.eventTitle),
  eventTime: String(sizes.eventTime),
  dayNumber: String(sizes.dayNumber),
})

// An empty or non-numeric field becomes 0 or NaN, which the schema rejects.
const numbersOf = (draft: FontSizesDraft) => ({
  eventTitle: Number(draft.eventTitle),
  eventTime: Number(draft.eventTime),
  dayNumber: Number(draft.dayNumber),
})

export const fontSizesDraftError = (draft: FontSizesDraft): string | null =>
  fontSizesSchema.safeParse(numbersOf(draft)).success
    ? null
    : `Podaj rozmiary czcionek jako liczby całkowite od ${FONT_SIZE_MIN_PX} do ${FONT_SIZE_MAX_PX}.`

/** Only for a draft without an error. */
export const fontSizesFromDraft = (draft: FontSizesDraft): FontSizes => fontSizesSchema.parse(numbersOf(draft))

export const fontSizeRem = (px: number): number => px / PX_PER_REM
