import { z } from 'zod'

const baseBlockSchema = z.object({
  id: z.string().min(1),
  marks: z.number().min(0).optional(),
  instructorOnly: z.boolean().optional(),
  instructorNotes: z.string().optional(),
})

const mcqBlockSchema = baseBlockSchema.extend({
  type: z.literal('mcq'),
  prompt: z.string(),
  options: z.array(z.string()).min(2).max(6),
  correctIndex: z.number().min(0).optional(),
})

const trueFalseBlockSchema = baseBlockSchema.extend({
  type: z.literal('true_false'),
  prompt: z.string(),
  answer: z.boolean().optional(),
})

const fillBlankBlockSchema = baseBlockSchema.extend({
  type: z.literal('fill_blank'),
  prompt: z.string(),
  answers: z.array(z.string()).optional(),
})

const essayBlockSchema = baseBlockSchema.extend({
  type: z.literal('essay'),
  prompt: z.string(),
  answerLines: z.number().int().min(0).max(30).optional(),
})

const imageQuestionSchema = baseBlockSchema.extend({
  type: z.literal('image_question'),
  prompt: z.string(),
  caption: z.string().optional(),
  assetId: z.string(),
  layout: z.enum(['top', 'left', 'right']).optional(),
  size: z.enum(['small', 'medium', 'large']).optional(),
})

const questionBlockSchema = z.discriminatedUnion('type', [
  mcqBlockSchema,
  trueFalseBlockSchema,
  fillBlankBlockSchema,
  essayBlockSchema,
  imageQuestionSchema,
])

const projectVersionEntrySchema = z.object({
  id: z.string().min(1),
  versionNumber: z.number().int().positive(),
  fileName: z.string().optional(),
  createdAt: z.string(),
  sourceProjectId: z.string().optional(),
})

export const examProjectSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  projectVersion: z.number().int().positive().optional(),
  baseProjectId: z.string().optional(),
  sourceProjectId: z.string().optional(),
  versionHistory: z.array(projectVersionEntrySchema).optional(),
  settings: z
    .object({
      templatePresetId: z
        .enum(['default_university', 'engineering_midterm', 'medical_final'])
        .optional(),
      targetTotalMarks: z.number().min(0).optional(),
      numberingMode: z.enum(['global', 'per_section']).optional(),
    })
    .optional(),
  templateFields: z.array(
    z.object({
      id: z.string(),
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
  ),
  sections: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      instructions: z.string().optional(),
      items: z.array(questionBlockSchema),
    }),
  ),
  assets: z.record(
    z.string(),
    z.object({
      id: z.string(),
      kind: z.literal('image'),
      path: z.string(),
      width: z.number().optional(),
      height: z.number().optional(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type ExamProjectSchema = z.infer<typeof examProjectSchema>
