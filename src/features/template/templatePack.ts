import { z } from 'zod'

import type { TemplateField, TemplatePresetId } from '@/types/exam'

const templateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  value: z.string(),
  section: z.enum(['header', 'footer']),
  locked: z.boolean().optional(),
  formatLocked: z.boolean().optional(),
  displayMode: z.enum(['label_value', 'value_only']).optional(),
  style: z
    .object({
      alignment: z.enum(['left', 'center', 'right', 'justify']).optional(),
      bold: z.boolean().optional(),
      italics: z.boolean().optional(),
      underline: z.boolean().optional(),
      fontSizePt: z.number().int().min(6).max(72).optional(),
      fontFamily: z.string().optional(),
      colorHex: z.string().optional(),
    })
    .optional(),
})

const templatePackSchema = z.object({
  version: z.literal(1),
  templatePresetId: z
    .enum([
      'default_university',
      'engineering_midterm',
      'medical_final',
      'shaqlawa_linux_gui',
    ])
    .optional(),
  templateFields: z.array(templateFieldSchema),
})

export type TemplatePack = z.infer<typeof templatePackSchema>

export const serializeTemplatePack = (params: {
  templateFields: TemplateField[]
  templatePresetId?: TemplatePresetId
}) =>
  JSON.stringify(
    {
      version: 1,
      templatePresetId: params.templatePresetId,
      templateFields: params.templateFields,
    } satisfies TemplatePack,
    null,
    2,
  )

export const parseTemplatePack = (jsonText: string): TemplatePack => {
  let raw: unknown

  try {
    raw = JSON.parse(jsonText)
  } catch {
    throw new Error('Template pack is not valid JSON.')
  }

  const parsed = templatePackSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error('Template pack format is invalid.')
  }

  return parsed.data
}
