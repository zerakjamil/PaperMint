import type { QuestionBankEntry, SnippetEntry } from '@/types/exam'

import {
  QUESTION_BANK_STORAGE_KEY,
  SNIPPET_STORAGE_KEY,
  clearLibraryStorage,
  readQuestionBank,
  readSnippets,
  writeQuestionBank,
  writeSnippets,
} from './libraryStorage'

const createMemoryStorage = (): Storage => {
  const data = new Map<string, string>()

  return {
    get length() {
      return data.size
    },
    clear: () => {
      data.clear()
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => Array.from(data.keys())[index] ?? null,
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

const now = '2026-04-22T00:00:00.000Z'

const bankFixture: QuestionBankEntry[] = [
  {
    id: 'bank-1',
    block: {
      id: 'q-1',
      type: 'essay',
      prompt: 'Explain CAP theorem.',
      answerLines: 6,
      marks: 10,
    },
    tags: ['distributed', 'final'],
    course: 'CS405',
    subject: 'Distributed Systems',
    chapter: 'Consistency',
    difficulty: 'medium',
    createdAt: now,
    updatedAt: now,
    sourceProjectId: 'project-1',
  },
]

const snippetFixture: SnippetEntry[] = [
  {
    id: 'snippet-1',
    kind: 'instruction',
    title: 'Standard note',
    content: 'Answer all questions. Show work where needed.',
    tags: ['default'],
    createdAt: now,
    updatedAt: now,
  },
]

describe('library storage', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('writes and reads question bank entries', () => {
    writeQuestionBank(storage, bankFixture)

    const recovered = readQuestionBank(storage)

    expect(recovered).toEqual(bankFixture)
  })

  it('writes and reads snippets', () => {
    writeSnippets(storage, snippetFixture)

    const recovered = readSnippets(storage)

    expect(recovered).toEqual(snippetFixture)
  })

  it('clears corrupted payloads and returns empty collections', () => {
    storage.setItem(QUESTION_BANK_STORAGE_KEY, '{broken')
    storage.setItem(SNIPPET_STORAGE_KEY, '{broken')

    const bank = readQuestionBank(storage)
    const snippets = readSnippets(storage)

    expect(bank).toEqual([])
    expect(snippets).toEqual([])
    expect(storage.getItem(QUESTION_BANK_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(SNIPPET_STORAGE_KEY)).toBeNull()
  })

  it('clears library storage keys', () => {
    writeQuestionBank(storage, bankFixture)
    writeSnippets(storage, snippetFixture)

    clearLibraryStorage(storage)

    expect(storage.getItem(QUESTION_BANK_STORAGE_KEY)).toBeNull()
    expect(storage.getItem(SNIPPET_STORAGE_KEY)).toBeNull()
  })
})
