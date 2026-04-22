import {
  AUTOSAVE_STORAGE_KEY,
  clearAutosaveProject,
  readAutosaveProject,
  writeAutosaveProject,
  writeAutosaveProjectWithFallback,
} from '@/features/project/autosaveStorage'
import { createAutosaveRecoveryFixture } from '@/test/fixtures/exams'

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

describe('autosave storage recovery', () => {
  let storage: Storage

  beforeEach(() => {
    storage = createMemoryStorage()
  })

  it('recovers valid autosave fixture', () => {
    const fixture = createAutosaveRecoveryFixture()
    writeAutosaveProject(storage, fixture)

    const recovered = readAutosaveProject(storage)

    expect(recovered).not.toBeNull()
    expect(recovered?.id).toBe(fixture.id)
    expect(recovered?.templateFields.find(f => f.label === "Exam Info")?.value || "").toBe('Recovered Subject')
  })

  it('clears invalid autosave payload', () => {
    storage.setItem(AUTOSAVE_STORAGE_KEY, '{bad json')

    const recovered = readAutosaveProject(storage)

    expect(recovered).toBeNull()
    expect(storage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()
  })

  it('removes draft on clear command', () => {
    writeAutosaveProject(storage, createAutosaveRecoveryFixture())

    clearAutosaveProject(storage)

    expect(storage.getItem(AUTOSAVE_STORAGE_KEY)).toBeNull()
  })

  it('falls back to slim local draft when localStorage quota is exceeded', async () => {
    const quotaStorage = createMemoryStorage()
    const originalSetItem = quotaStorage.setItem.bind(quotaStorage)
    quotaStorage.setItem = (key, value) => {
      if (value.includes('data:image/')) {
        throw new Error('QuotaExceededError')
      }
      originalSetItem(key, value)
    }

    const fixture = createAutosaveRecoveryFixture()
    fixture.templateFields[0] = {
      ...fixture.templateFields[0],
      value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=',
    }

    const target = await writeAutosaveProjectWithFallback(quotaStorage, fixture)

    expect(target).toBe('local-storage-slim')
    const raw = quotaStorage.getItem(AUTOSAVE_STORAGE_KEY)
    expect(raw).not.toBeNull()
    expect(raw).not.toContain('data:image/')
    expect(readAutosaveProject(quotaStorage)).not.toBeNull()
  })
})
