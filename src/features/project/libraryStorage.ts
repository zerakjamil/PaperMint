import { z } from 'zod'

import type { QuestionBankEntry, SnippetEntry } from '@/types/exam'

export const QUESTION_BANK_STORAGE_KEY = 'papermint.library.question-bank.v1'
export const SNIPPET_STORAGE_KEY = 'papermint.library.snippets.v1'

const baseBlockSchema = z.object({
  id: z.string().min(1),
  marks: z.number().min(0).optional(),
})

const questionBlockSchema = z.discriminatedUnion('type', [
  baseBlockSchema.extend({
    type: z.literal('mcq'),
    prompt: z.string(),
    options: z.array(z.string()).min(2).max(6),
    correctIndex: z.number().min(0).optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal('true_false'),
    prompt: z.string(),
    answer: z.boolean().optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal('fill_blank'),
    prompt: z.string(),
    answers: z.array(z.string()).optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal('essay'),
    prompt: z.string(),
    answerLines: z.number().int().min(0).max(30).optional(),
  }),
  baseBlockSchema.extend({
    type: z.literal('image_question'),
    prompt: z.string(),
    caption: z.string().optional(),
    assetId: z.string(),
    layout: z.enum(['top', 'left', 'right']).optional(),
    size: z.enum(['small', 'medium', 'large']).optional(),
  }),
])

const questionBankEntrySchema = z.object({
  id: z.string().min(1),
  block: questionBlockSchema,
  tags: z.array(z.string()),
  course: z.string().optional(),
  subject: z.string().optional(),
  chapter: z.string().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  sourceProjectId: z.string().optional(),
})

const snippetEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['instruction', 'header', 'footer', 'note']),
  title: z.string().min(1),
  content: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const questionBankSchema = z.array(questionBankEntrySchema)
const snippetSchema = z.array(snippetEntrySchema)

const readWithSchema = <T>(
  storage: Storage,
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): T => {
  const raw = storage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    const parsed = JSON.parse(raw)
    const validated = schema.safeParse(parsed)
    if (!validated.success) {
      storage.removeItem(key)
      return fallback
    }

    return validated.data
  } catch {
    storage.removeItem(key)
    return fallback
  }
}

export const readQuestionBank = (storage: Storage): QuestionBankEntry[] =>
  readWithSchema(storage, QUESTION_BANK_STORAGE_KEY, questionBankSchema, [])

export const writeQuestionBank = (storage: Storage, entries: QuestionBankEntry[]) => {
  storage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(entries))
}

export const readSnippets = (storage: Storage): SnippetEntry[] =>
  readWithSchema(storage, SNIPPET_STORAGE_KEY, snippetSchema, [])

export const writeSnippets = (storage: Storage, entries: SnippetEntry[]) => {
  storage.setItem(SNIPPET_STORAGE_KEY, JSON.stringify(entries))
}

export const clearLibraryStorage = (storage: Storage) => {
  storage.removeItem(QUESTION_BANK_STORAGE_KEY)
  storage.removeItem(SNIPPET_STORAGE_KEY)
}
