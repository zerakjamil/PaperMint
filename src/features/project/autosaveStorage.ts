import { parseProjectText } from '@/lib/file-system/projectFile'
import type { ExamProject } from '@/types/exam'

export const AUTOSAVE_STORAGE_KEY = 'papermint.autosave.project.v1'
const AUTOSAVE_DB_NAME = 'papermint-autosave'
const AUTOSAVE_DB_STORE = 'drafts'
const AUTOSAVE_DB_RECORD_KEY = 'latest'
const IMAGE_DATA_URL_PREFIX = 'data:image/'

export type AutosaveReadSource = 'none' | 'local-storage' | 'indexed-db'
export type AutosaveWriteTarget =
  | 'local-storage'
  | 'indexed-db'
  | 'local-storage-slim'

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

const asStorageLike = (storage: unknown): StorageLike | null => {
  if (!storage || typeof storage !== 'object') {
    return null
  }

  const candidate = storage as Partial<StorageLike>
  if (
    typeof candidate.getItem !== 'function' ||
    typeof candidate.setItem !== 'function' ||
    typeof candidate.removeItem !== 'function'
  ) {
    return null
  }

  return candidate as StorageLike
}

export const readAutosaveProject = (storage: Storage | null | undefined): ExamProject | null => {
  const safeStorage = asStorageLike(storage)
  if (!safeStorage) {
    return null
  }

  const value = safeStorage.getItem(AUTOSAVE_STORAGE_KEY)
  if (!value) {
    return null
  }

  try {
    return parseProjectText(value)
  } catch {
    safeStorage.removeItem(AUTOSAVE_STORAGE_KEY)
    return null
  }
}

export const writeAutosaveProject = (storage: Storage | null | undefined, project: ExamProject) => {
  const safeStorage = asStorageLike(storage)
  if (!safeStorage) {
    return
  }

  safeStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(project))
}

export const clearAutosaveProject = (storage: Storage | null | undefined) => {
  const safeStorage = asStorageLike(storage)
  if (!safeStorage) {
    return
  }

  safeStorage.removeItem(AUTOSAVE_STORAGE_KEY)
}

const openAutosaveDb = () =>
  new Promise<IDBDatabase | null>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null)
      return
    }

    const request = indexedDB.open(AUTOSAVE_DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(AUTOSAVE_DB_STORE)) {
        db.createObjectStore(AUTOSAVE_DB_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Unable to open autosave database.'))
  })

const writeIndexedDbAutosave = async (project: ExamProject) => {
  const db = await openAutosaveDb()
  if (!db) {
    return false
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_DB_STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Unable to write autosave draft.'))
      tx.objectStore(AUTOSAVE_DB_STORE).put(JSON.stringify(project), AUTOSAVE_DB_RECORD_KEY)
    })
    return true
  } finally {
    db.close()
  }
}

const readIndexedDbAutosave = async () => {
  const db = await openAutosaveDb()
  if (!db) {
    return null
  }

  try {
    const value = await new Promise<unknown>((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_DB_STORE, 'readonly')
      tx.onerror = () => reject(tx.error ?? new Error('Unable to read autosave draft.'))
      const request = tx.objectStore(AUTOSAVE_DB_STORE).get(AUTOSAVE_DB_RECORD_KEY)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error ?? new Error('Unable to read autosave record.'))
    })

    if (typeof value !== 'string' || !value) {
      return null
    }

    try {
      return parseProjectText(value)
    } catch {
      await clearIndexedDbAutosave()
      return null
    }
  } finally {
    db.close()
  }
}

const clearIndexedDbAutosave = async () => {
  const db = await openAutosaveDb()
  if (!db) {
    return
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(AUTOSAVE_DB_STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Unable to clear autosave draft.'))
      tx.objectStore(AUTOSAVE_DB_STORE).delete(AUTOSAVE_DB_RECORD_KEY)
    })
  } finally {
    db.close()
  }
}

const stripHeavyPayloads = (project: ExamProject): ExamProject => ({
  ...project,
  templateFields: project.templateFields.map((field) => ({
    ...field,
    value: field.value.startsWith(IMAGE_DATA_URL_PREFIX)
      ? '[image omitted in autosave draft]'
      : field.value,
  })),
  assets: {},
})

export const readAutosaveProjectWithFallback = async (
  storage: Storage | null | undefined,
): Promise<{ project: ExamProject | null; source: AutosaveReadSource }> => {
  const local = readAutosaveProject(storage)
  if (local) {
    return { project: local, source: 'local-storage' }
  }

  try {
    const indexed = await readIndexedDbAutosave()
    if (indexed) {
      return { project: indexed, source: 'indexed-db' }
    }
  } catch {
    return { project: null, source: 'none' }
  }

  return { project: null, source: 'none' }
}

export const writeAutosaveProjectWithFallback = async (
  storage: Storage | null | undefined,
  project: ExamProject,
): Promise<AutosaveWriteTarget> => {
  const safeStorage = asStorageLike(storage)

  if (safeStorage) {
    try {
      writeAutosaveProject(safeStorage as Storage, project)
      return 'local-storage'
    } catch {
      // Try indexedDB and then slim local fallback.
    }
  }

  try {
    const savedToIndexedDb = await writeIndexedDbAutosave(project)
    if (savedToIndexedDb) {
      return 'indexed-db'
    }
  } catch {
    // Fall through to slim local draft fallback.
  }

  writeAutosaveProject(safeStorage as Storage | null, stripHeavyPayloads(project))
  return 'local-storage-slim'
}

export const clearAutosaveProjectWithFallback = async (
  storage: Storage | null | undefined,
) => {
  clearAutosaveProject(storage)
  try {
    await clearIndexedDbAutosave()
  } catch {
    // No-op if indexedDB is unavailable.
  }
}
