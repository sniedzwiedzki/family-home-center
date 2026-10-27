import { z } from 'zod'
import { columnLayoutSchema, DEFAULT_COLUMN_LAYOUT } from '../calendar/columns'
import { DEFAULT_SPECIAL_TAG } from '../calendar/specialTag'
import { familyMembersSchema, tagSchema } from '../family/familyMember'
import { DEFAULT_FONT_SIZES, fontSizesSchema } from './fontSizes'

export const SETTINGS_STORAGE_KEY = 'fhc.settings.v1'

export const geoLocationSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const knownCalendarSchema = z.object({ id: z.string(), name: z.string(), canWrite: z.boolean() })

export const googleCredentialsSchema = z.object({
  clientId: z.string().trim().min(1),
  clientSecret: z.string().trim().min(1),
  refreshToken: z.string().trim().min(1),
})

export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'

export const geminiSettingsSchema = z.object({
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
})

export const settingsSchema = z.object({
  familyMembers: familyMembersSchema,
  calendars: z.object({
    readIds: z.array(z.string()),
    writeId: z.string().nullable(),
    // Added later: settings saved before it existed must still load.
    known: z.array(knownCalendarSchema).default([]),
  }),
  google: googleCredentialsSchema.nullable().default(null),
  // Added later: settings saved before it existed must still load.
  gemini: geminiSettingsSchema.nullable().default(null),
  weather: z.object({
    location: geoLocationSchema.nullable(),
  }),
  pin: z.string().regex(/^\d{4,8}$/).nullable(),
  // Added later: settings saved before it existed must still load.
  fontSizes: fontSizesSchema.default(DEFAULT_FONT_SIZES),
  // Added later: settings saved before it existed must still load.
  specialTag: tagSchema.default(DEFAULT_SPECIAL_TAG),
  // Added later: settings saved before it existed must still load.
  columns: columnLayoutSchema.default(DEFAULT_COLUMN_LAYOUT),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  familyMembers: [],
  calendars: { readIds: [], writeId: null, known: [] },
  google: null,
  gemini: null,
  weather: { location: null },
  pin: null,
  fontSizes: DEFAULT_FONT_SIZES,
  specialTag: DEFAULT_SPECIAL_TAG,
  columns: DEFAULT_COLUMN_LAYOUT,
}

export function loadSettings(storage: Pick<Storage, 'getItem'>): Settings {
  const raw = storage.getItem(SETTINGS_STORAGE_KEY)
  if (raw === null) return DEFAULT_SETTINGS
  try {
    const parsed = settingsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : DEFAULT_SETTINGS
  } catch (error) {
    console.error('Stored settings are not valid JSON; using defaults', error)
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(storage: Pick<Storage, 'setItem'>, settings: Settings): void {
  storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
