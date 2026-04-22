import { createDefaultProject } from '@/features/template/defaultTemplate'

import { selectIsDirty, useExamStore } from './examStore'

describe('exam store dirty-state', () => {
  beforeEach(() => {
    useExamStore.getState().startNewProject()
  })

  it('starts in a clean state', () => {
    expect(selectIsDirty(useExamStore.getState())).toBe(false)
  })

  it('becomes dirty after project mutation', () => {
    const store = useExamStore.getState();
    store.updateTemplateField(store.project.templateFields[0].id, { value: "Operating Systems" })
    expect(selectIsDirty(useExamStore.getState())).toBe(true)
  })

  it('returns to clean state after marking persisted', () => {
    const store = useExamStore.getState()
    store.updateTemplateField(store.project.templateFields[0].id, { value: "Operating Systems" })

    expect(selectIsDirty(useExamStore.getState())).toBe(true)

    store.markProjectPersisted('2026-04-22T00:00:00.000Z')

    const latest = useExamStore.getState()
    expect(selectIsDirty(latest)).toBe(false)
    expect(latest.lastSavedAt).toBe('2026-04-22T00:00:00.000Z')
  })

  it('marks opened project as clean', () => {
    const store = useExamStore.getState()
    const project = createDefaultProject()

    store.openProject(project, 'imported.exam.json')

    expect(selectIsDirty(useExamStore.getState())).toBe(false)
  })
})
