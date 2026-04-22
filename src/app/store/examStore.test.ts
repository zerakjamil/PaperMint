import { createBlock } from '@/features/questions/blockFactory'

import { useExamStore } from './examStore'

describe('exam store', () => {
  beforeEach(() => {
    useExamStore.getState().startNewProject()
  })

  it('creates a new project with one default essay block', () => {
    const state = useExamStore.getState()
    const section = state.project.sections[0]

    expect(section.items).toHaveLength(1)
    expect(section.items[0]?.type).toBe('essay')
  })

  it('inserts blocks at exact insertion index', () => {
    const store = useExamStore.getState()

    store.addBlock('mcq', 0)
    store.addBlock('true_false', 1)

    const items = useExamStore.getState().project.sections[0]?.items ?? []

    expect(items[0]?.type).toBe('mcq')
    expect(items[1]?.type).toBe('true_false')
  })

  it('reorders blocks by index', () => {
    const store = useExamStore.getState()

    store.updateBlock(store.project.sections[0]!.items[0]!.id, () => createBlock('essay'))
    store.addBlock('mcq', 1)
    store.addBlock('true_false', 2)

    store.moveBlockByIndex(2, 0)

    const items = useExamStore.getState().project.sections[0]?.items ?? []
    expect(items[0]?.type).toBe('true_false')
  })

  it('duplicates and deletes selected block safely', () => {
    const store = useExamStore.getState()
    const blockId = store.project.sections[0]!.items[0]!.id

    store.duplicateBlock(blockId)
    let items = useExamStore.getState().project.sections[0]?.items ?? []
    expect(items).toHaveLength(2)

    store.deleteBlock(blockId)
    items = useExamStore.getState().project.sections[0]?.items ?? []
    expect(items).toHaveLength(1)
  })

  it('updates template metadata fields', () => {
    const store = useExamStore.getState()
    store.updateTemplateField(store.project.templateFields.find(f => f.label === "Exam Info")!.id, { value: "Data Structures" })

    expect(useExamStore.getState().project.templateFields.find(f => f.label === "Exam Info")?.value || "").toBe('Data Structures')
  })
})
