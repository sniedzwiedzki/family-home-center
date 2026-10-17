import { z } from 'zod'
import { familyMembersSchema } from '../family/familyMember'

export const SETTINGS_STORAGE_KEY = 'fhc.settings.v1'

export const geoLocationSchema = z.object({
  name: z.string().trim().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const settingsSchema = z.object({
  familyMembers: familyMembersSchema,
  calendars: z.object({
    readIds: z.array(z.string()),
    writeId: z.string().nullable(),
  }),
  weather: z.object({
    location: geoLocationSchema.nullable(),
  }),
  pin: z.string().regex(/^\d{4,8}$/).nullable(),
})

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  familyMembers: [],
  calendars: { readIds: [], writeId: null },
  weather: { location: null },
  pin: null,
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
