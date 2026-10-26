import { z } from 'zod'

const MAX_NAME_LENGTH = 30
const MAX_TAG_LENGTH = 20

export const normalizeTag = (tag: string): string => tag.trim().toLowerCase()

export const tagSchema = z
  .string()
  .transform(normalizeTag)
  .pipe(z.string().min(1).max(MAX_TAG_LENGTH).regex(/^[\p{L}\p{N}_-]+$/u))

export const familyMemberSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(MAX_NAME_LENGTH),
  tag: tagSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
})

export type FamilyMember = z.infer<typeof familyMemberSchema>

export const familyMembersSchema = z.array(familyMemberSchema).superRefine((members, context) => {
  const ids = new Set<string>()
  const tags = new Set<string>()
  members.forEach((member, index) => {
    if (ids.has(member.id)) context.addIssue({ code: 'custom', path: [index, 'id'], message: 'Duplicate id' })
    if (tags.has(member.tag)) context.addIssue({ code: 'custom', path: [index, 'tag'], message: 'Duplicate tag' })
    ids.add(member.id)
    tags.add(member.tag)
  })
})
