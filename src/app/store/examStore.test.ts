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
    const field = store.project.templateFields.find((entry) => entry.section === 'header')
    if (!field) {
      throw new Error('Expected at least one header field in default template.')
    }

    store.updateTemplateField(field.id, { value: 'Data Structures' })

    expect(
      useExamStore
        .getState()
        .project.templateFields.find((entry) => entry.id === field.id)?.value,
    ).toBe('Data Structures')
  })

  it('replaces template fields from imported pack data', () => {
    const store = useExamStore.getState()

    store.replaceTemplateFields(
      [
        {
          id: 'template-logo',
          label: 'Institution Logo',
          value: 'data:image/png;base64,abc',
          section: 'header',
          displayMode: 'value_only',
        },
        {
          id: 'template-footer',
          label: 'Footer Blessing',
          value: 'Best of Luck',
          section: 'footer',
          displayMode: 'value_only',
        },
      ],
      'engineering_midterm',
    )

    const next = useExamStore.getState().project
    expect(next.templateFields).toHaveLength(2)
    expect(next.templateFields[0]?.label).toBe('Institution Logo')
    expect(next.settings?.templatePresetId).toBe('engineering_midterm')
  })

  it('adds and selects section with default block', () => {
    const store = useExamStore.getState()
    const beforeCount = store.project.sections.length

    store.addSection()

    const next = useExamStore.getState()
    expect(next.project.sections).toHaveLength(beforeCount + 1)
    expect(next.selectedSectionId).toBe(next.project.sections.at(-1)?.id)
    expect(next.project.sections.at(-1)?.items[0]?.type).toBe('essay')
  })

  it('updates project settings for marks and numbering', () => {
    const store = useExamStore.getState()
    store.setTargetTotalMarks(120)
    store.setNumberingMode('per_section')

    const next = useExamStore.getState().project.settings
    expect(next?.targetTotalMarks).toBe(120)
    expect(next?.numberingMode).toBe('per_section')
  })

  it('initializes project version metadata defaults', () => {
    const project = useExamStore.getState().project

    expect(project.projectVersion).toBe(1)
    expect(project.versionHistory).toEqual([])
  })

  it('backfills version metadata when opening legacy project', () => {
    const store = useExamStore.getState()
    const legacyProject = {
      ...store.project,
      projectVersion: undefined,
      versionHistory: undefined,
    }

    store.openProject(legacyProject)

    const opened = useExamStore.getState().project
    expect(opened.projectVersion).toBe(1)
    expect(opened.versionHistory).toEqual([])
  })

  it('prevents edits to locked template fields', () => {
    const store = useExamStore.getState()
    store.replaceTemplateFields([
      {
        id: 'locked-header',
        label: 'Locked Header',
        value: 'Institution Name',
        section: 'header',
        locked: true,
        formatLocked: true,
      },
    ])

    const lockedField = useExamStore.getState().project.templateFields[0]!

    store.updateTemplateField(lockedField.id, {
      label: 'Changed Label',
      value: 'Changed Value',
      style: { alignment: 'right' },
      displayMode: 'value_only',
    })

    const updated = useExamStore
      .getState()
      .project.templateFields.find((field) => field.id === lockedField.id)

    expect(updated?.label).toBe(lockedField.label)
    expect(updated?.value).toBe(lockedField.value)
    expect(updated?.style).toEqual(lockedField.style)
    expect(updated?.displayMode).toBe(lockedField.displayMode)
  })

  it('prevents deleting locked template fields', () => {
    const store = useExamStore.getState()
    store.replaceTemplateFields([
      {
        id: 'locked-footer',
        label: 'Locked Footer',
        value: 'Examiner Signature',
        section: 'footer',
        locked: true,
      },
    ])

    const lockedField = useExamStore.getState().project.templateFields[0]!

    store.removeTemplateField(lockedField.id)

    const stillThere = useExamStore
      .getState()
      .project.templateFields.some((field) => field.id === lockedField.id)
    expect(stillThere).toBe(true)
  })

  it('saves selected block to bank and inserts cloned question', () => {
    const store = useExamStore.getState()
    const sourceBlock = store.project.sections[0]!.items[0]!

    store.saveBlockToBank(sourceBlock.id, ['phase2'])

    const saved = useExamStore.getState().questionBank[0]
    expect(saved).toBeDefined()
    expect(saved?.block.id).toBe(sourceBlock.id)
    expect(saved?.tags).toEqual(['phase2'])

    store.insertFromBank(saved!.id, 1)

    const next = useExamStore.getState()
    const items = next.project.sections[0]!.items
    expect(items).toHaveLength(2)
    expect(items[1]!.id).not.toBe(sourceBlock.id)
    expect(items[1]!.prompt).toBe(sourceBlock.prompt)
    expect(next.selectedBlockId).toBe(items[1]!.id)
  })

  it('saves snippet and applies to section instructions', () => {
    const store = useExamStore.getState()
    const sectionId = store.project.sections[0]!.id

    store.saveSnippet({
      kind: 'instruction',
      title: 'Answer policy',
      content: 'Answer all questions in this section.',
      tags: ['default'],
    })

    const snippet = useExamStore.getState().snippets[0]
    expect(snippet).toBeDefined()

    store.applySnippetToSectionInstructions(snippet!.id, sectionId)

    const nextSection = useExamStore
      .getState()
      .project.sections.find((section) => section.id === sectionId)
    expect(nextSection?.instructions).toContain('Answer all questions in this section.')
  })

  it('applies snippet to block prompt', () => {
    const store = useExamStore.getState()
    const blockId = store.project.sections[0]!.items[0]!.id

    store.saveSnippet({
      kind: 'note',
      title: 'Marks note',
      content: 'Show steps for full marks.',
      tags: [],
    })

    const snippetId = useExamStore.getState().snippets[0]!.id
    store.applySnippetToBlockPrompt(snippetId, blockId)

    const block = useExamStore
      .getState()
      .project.sections[0]!.items.find((item) => item.id === blockId)
    expect(block?.prompt).toContain('Show steps for full marks.')
  })

  it('updates instructor-only metadata for a question block', () => {
    const store = useExamStore.getState()
    const blockId = store.project.sections[0]!.items[0]!.id

    store.updateBlock(blockId, (block) => ({
      ...block,
      instructorOnly: true,
      instructorNotes: 'Assess conceptual understanding before formula steps.',
    }))

    const updatedBlock = useExamStore
      .getState()
      .project.sections[0]!.items.find((item) => item.id === blockId)

    expect(updatedBlock?.instructorOnly).toBe(true)
    expect(updatedBlock?.instructorNotes).toBe(
      'Assess conceptual understanding before formula steps.',
    )
  })

  it('starts Shaqlawa Linux GUI template project', () => {
    const store = useExamStore.getState()

    store.startShaqlawaLinuxGuiProject()

    const next = useExamStore.getState().project
    expect(next.settings?.templatePresetId).toBe('shaqlawa_linux_gui')
    expect(next.settings?.targetTotalMarks).toBe(60)
    expect(next.sections).toHaveLength(4)
    expect(next.sections[0]?.title).toBe('Q1/ Choose the right answer:')
    expect(Object.values(next.assets).some((asset) => asset.path === '/templates/linux-gui-q4.png')).toBe(true)
  })
})
