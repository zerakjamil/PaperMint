import { create } from 'zustand'

import { createBlock } from '@/features/questions/blockFactory'
import { createDefaultProject } from '@/features/template/defaultTemplate'
import { createShaqlawaLinuxGuiProject } from '@/features/template/linuxGuiTemplate'
import { applyTemplatePreset } from '@/features/template/templateLibrary'
import type { SaveHandle } from '@/lib/file-system/projectFile'
import { newId } from '@/lib/utils/id'
import type {
  BlockType,
  ExamProject,
  NumberingMode,
  QuestionBankEntry,
  QuestionBlock,
  QuestionBlock as QuestionBlockType,
  SnippetEntry,
  SnippetKind,
  TemplateField,
  TemplatePresetId,
} from '@/types/exam'

type Screen = 'home' | 'editor'

type ExamStoreState = {
  project: ExamProject
  questionBank: QuestionBankEntry[]
  snippets: SnippetEntry[]
  selectedSectionId: string
  selectedBlockId: string | null
  screen: Screen
  projectFileName: string
  saveHandle: SaveHandle | null
  revision: number
  persistedRevision: number
  lastSavedAt: string | null
  setScreen: (screen: Screen) => void
  startNewProject: () => void
  startShaqlawaLinuxGuiProject: () => void
  openProject: (project: ExamProject, fileName?: string) => void
  addTemplateField: (section: 'header' | 'footer') => void
  updateTemplateField: (
    id: string,
    updates: Partial<
      Pick<TemplateField, 'label' | 'value' | 'displayMode' | 'style'>
    >,
  ) => void
  removeTemplateField: (id: string) => void
  replaceTemplateFields: (
    templateFields: TemplateField[],
    templatePresetId?: TemplatePresetId,
  ) => void
  applyTemplatePreset: (presetId: TemplatePresetId) => void
  addSection: () => void
  updateSection: (
    sectionId: string,
    updates: Partial<Pick<ExamProject['sections'][number], 'title' | 'instructions'>>,
  ) => void
  selectSection: (sectionId: string) => void
  duplicateSection: (sectionId: string) => void
  deleteSection: (sectionId: string) => void
  setTargetTotalMarks: (targetTotalMarks: number | undefined) => void
  setNumberingMode: (mode: NumberingMode) => void
  saveBlockToBank: (blockId: string, tags?: string[]) => string | null
  insertFromBank: (entryId: string, insertionIndex: number) => void
  saveSnippet: (payload: {
    kind: SnippetKind
    title: string
    content: string
    tags?: string[]
  }) => string
  applySnippetToSectionInstructions: (snippetId: string, sectionId: string) => void
  applySnippetToBlockPrompt: (snippetId: string, blockId: string) => void
  applySnippetToTemplateField: (snippetId: string, fieldId: string) => void
  addBlock: (type: BlockType, insertionIndex: number) => void
  addImageBlock: (dataUrl: string, insertionIndex: number) => void
  updateBlock: (
    blockId: string,
    updater: (block: QuestionBlockType) => QuestionBlockType,
  ) => void
  moveBlockByDirection: (blockId: string, direction: -1 | 1) => void
  moveBlockByIndex: (fromIndex: number, toIndex: number) => void
  duplicateBlock: (blockId: string) => void
  deleteBlock: (blockId: string) => void
  selectBlock: (blockId: string | null) => void
  attachImageAsset: (blockId: string, dataUrl: string) => void
  setProjectFileName: (name: string) => void
  setSaveHandle: (handle: SaveHandle | null) => void
  markProjectPersisted: (savedAt?: string) => void
}

const touch = (project: ExamProject): ExamProject => ({
  ...project,
  updatedAt: new Date().toISOString(),
})

const defaultProject = createDefaultProject()

const withProjectDefaults = (project: ExamProject): ExamProject => ({
  ...project,
  projectVersion: project.projectVersion ?? 1,
  versionHistory: project.versionHistory ?? [],
  settings: {
    templatePresetId: project.settings?.templatePresetId,
    targetTotalMarks: project.settings?.targetTotalMarks ?? 100,
    numberingMode: project.settings?.numberingMode ?? 'global',
  },
})

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const cloned = [...items]
  const [moved] = cloned.splice(fromIndex, 1)
  cloned.splice(toIndex, 0, moved)
  return cloned
}

const cloneBlockWithNewId = (block: QuestionBlock): QuestionBlock => ({
  ...block,
  id: newId(),
})

const findBlock = (project: ExamProject, blockId: string) => {
  for (const section of project.sections) {
    const block = section.items.find((item) => item.id === blockId)
    if (block) {
      return block
    }
  }
  return null
}

const appendSnippetContent = (existing: string | undefined, snippetContent: string) => {
  const trimmed = (existing ?? '').trim()
  if (!trimmed) {
    return snippetContent
  }
  return `${trimmed}\n${snippetContent}`
}

const getSectionItems = (project: ExamProject, sectionId: string) => {
  const section = project.sections.find((item) => item.id === sectionId)
  return section?.items ?? []
}

export const useExamStore = create<ExamStoreState>((set, get) => ({
  project: defaultProject,
  questionBank: [],
  snippets: [],
  selectedSectionId: defaultProject.sections[0]?.id ?? '',
  selectedBlockId: defaultProject.sections[0]?.items[0]?.id ?? null,
  screen: 'home',
  projectFileName: 'exam-project.exam.json',
  saveHandle: null,
  revision: 0,
  persistedRevision: 0,
  lastSavedAt: null,
  setScreen: (screen) => {
    set({ screen })
  },
  startNewProject: () => {
    const project = createDefaultProject()
    set({
      project,
      selectedSectionId: project.sections[0]?.id ?? '',
      selectedBlockId: project.sections[0]?.items[0]?.id ?? null,
      projectFileName: 'exam-project.exam.json',
      saveHandle: null,
      screen: 'editor',
      revision: 0,
      persistedRevision: 0,
      lastSavedAt: null,
    })
  },
  startShaqlawaLinuxGuiProject: () => {
    const project = createShaqlawaLinuxGuiProject()
    set({
      project,
      selectedSectionId: project.sections[0]?.id ?? '',
      selectedBlockId: project.sections[0]?.items[0]?.id ?? null,
      projectFileName: 'linux-gui-template.exam.json',
      saveHandle: null,
      screen: 'editor',
      revision: 0,
      persistedRevision: 0,
      lastSavedAt: null,
    })
  },
  openProject: (project, fileName) => {
    const nextProject = withProjectDefaults(project)

    set({
      project: nextProject,
      selectedSectionId: nextProject.sections[0]?.id ?? '',
      selectedBlockId: nextProject.sections[0]?.items[0]?.id ?? null,
      projectFileName: fileName ?? 'exam-project.exam.json',
      screen: 'editor',
      revision: 0,
      persistedRevision: 0,
      lastSavedAt: null,
    })
  },
  addTemplateField: (section) => {
    set((state) => ({
      project: touch({
        ...state.project,
        templateFields: [
          ...state.project.templateFields,
          { id: newId(), label: 'New Field', value: '', section },
        ],
      }),
      revision: state.revision + 1,
    }))
  },

  updateTemplateField: (id, updates) => {
    set((state) => ({
      project: touch({
        ...state.project,
        templateFields: state.project.templateFields.map((f) =>
          f.id === id
            ? {
                ...f,
                ...(f.locked
                  ? {}
                  : {
                      ...(updates.label !== undefined
                        ? { label: updates.label }
                        : {}),
                      ...(updates.value !== undefined
                        ? { value: updates.value }
                        : {}),
                    }),
                ...(!f.formatLocked && updates.displayMode !== undefined
                  ? { displayMode: updates.displayMode }
                  : {}),
                ...(!f.formatLocked && updates.style
                  ? { style: { ...f.style, ...updates.style } }
                  : {}),
              }
            : f
        ),
      }),
      revision: state.revision + 1,
    }))
  },

  removeTemplateField: (id) => {
    set((state) => ({
      project: touch({
        ...state.project,
        templateFields: state.project.templateFields.filter(
          (f) => f.id !== id || Boolean(f.locked),
        ),
      }),
      revision: state.revision + 1,
    }))
  },
  replaceTemplateFields: (templateFields, templatePresetId) => {
    set((state) => ({
      project: touch({
        ...state.project,
        templateFields,
        settings: {
          ...state.project.settings,
          templatePresetId:
            templatePresetId ?? state.project.settings?.templatePresetId,
        },
      }),
      revision: state.revision + 1,
    }))
  },
  applyTemplatePreset: (presetId) => {
    set((state) => ({
      project: touch(applyTemplatePreset(state.project, presetId)),
      revision: state.revision + 1,
    }))
  },
  addSection: () => {
    set((state) => {
      const newSection = {
        id: newId(),
        title: `Section ${String.fromCharCode(65 + state.project.sections.length)}`,
        instructions: 'Answer all questions in this section.',
        items: [createBlock('essay')],
      }

      return {
        project: touch({
          ...state.project,
          sections: [...state.project.sections, newSection],
        }),
        selectedSectionId: newSection.id,
        selectedBlockId: newSection.items[0]?.id ?? null,
        revision: state.revision + 1,
      }
    })
  },
  updateSection: (sectionId, updates) => {
    set((state) => ({
      project: touch({
        ...state.project,
        sections: state.project.sections.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section,
        ),
      }),
      revision: state.revision + 1,
    }))
  },
  selectSection: (sectionId) => {
    set((state) => {
      const section = state.project.sections.find((item) => item.id === sectionId)
      return {
        selectedSectionId: sectionId,
        selectedBlockId: section?.items[0]?.id ?? null,
      }
    })
  },
  duplicateSection: (sectionId) => {
    set((state) => {
      const index = state.project.sections.findIndex((section) => section.id === sectionId)
      if (index < 0) {
        return state
      }

      const source = state.project.sections[index]
      const duplicated = {
        ...source,
        id: newId(),
        title: source.title ? `${source.title} (Copy)` : 'Section Copy',
        items: source.items.map((item) => ({ ...item, id: newId() })),
      }

      const sections = [...state.project.sections]
      sections.splice(index + 1, 0, duplicated)

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedSectionId: duplicated.id,
        selectedBlockId: duplicated.items[0]?.id ?? null,
        revision: state.revision + 1,
      }
    })
  },
  deleteSection: (sectionId) => {
    set((state) => {
      if (state.project.sections.length <= 1) {
        return state
      }

      const sections = state.project.sections.filter((section) => section.id !== sectionId)
      const fallbackSection = sections[0]

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedSectionId:
          state.selectedSectionId === sectionId
            ? fallbackSection?.id ?? ''
            : state.selectedSectionId,
        selectedBlockId:
          state.selectedSectionId === sectionId
            ? fallbackSection?.items[0]?.id ?? null
            : state.selectedBlockId,
        revision: state.revision + 1,
      }
    })
  },
  setTargetTotalMarks: (targetTotalMarks) => {
    set((state) => ({
      project: touch({
        ...state.project,
        settings: {
          ...state.project.settings,
          targetTotalMarks,
        },
      }),
      revision: state.revision + 1,
    }))
  },
  setNumberingMode: (mode) => {
    set((state) => ({
      project: touch({
        ...state.project,
        settings: {
          ...state.project.settings,
          numberingMode: mode,
        },
      }),
      revision: state.revision + 1,
    }))
  },
  saveBlockToBank: (blockId, tags = []) => {
    let entryId: string | null = null

    set((state) => {
      const block = findBlock(state.project, blockId)
      if (!block) {
        return state
      }

      const timestamp = new Date().toISOString()
      const nextEntry: QuestionBankEntry = {
        id: newId(),
        block: { ...block },
        tags,
        createdAt: timestamp,
        updatedAt: timestamp,
        sourceProjectId: state.project.id,
      }

      entryId = nextEntry.id

      return {
        questionBank: [nextEntry, ...state.questionBank],
      }
    })

    return entryId
  },
  insertFromBank: (entryId, insertionIndex) => {
    set((state) => {
      const entry = state.questionBank.find((item) => item.id === entryId)
      if (!entry) {
        return state
      }

      const cloned = cloneBlockWithNewId(entry.block)
      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        const safeIndex = Math.max(0, Math.min(section.items.length, insertionIndex))
        const items = [...section.items]
        items.splice(safeIndex, 0, cloned)

        return {
          ...section,
          items,
        }
      })

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedBlockId: cloned.id,
        revision: state.revision + 1,
      }
    })
  },
  saveSnippet: ({ kind, title, content, tags = [] }) => {
    const timestamp = new Date().toISOString()
    const nextSnippet: SnippetEntry = {
      id: newId(),
      kind,
      title,
      content,
      tags,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    set((state) => ({
      snippets: [nextSnippet, ...state.snippets],
    }))

    return nextSnippet.id
  },
  applySnippetToSectionInstructions: (snippetId, sectionId) => {
    set((state) => {
      const snippet = state.snippets.find((item) => item.id === snippetId)
      if (!snippet) {
        return state
      }

      return {
        project: touch({
          ...state.project,
          sections: state.project.sections.map((section) =>
            section.id === sectionId
              ? {
                  ...section,
                  instructions: appendSnippetContent(section.instructions, snippet.content),
                }
              : section,
          ),
        }),
        revision: state.revision + 1,
      }
    })
  },
  applySnippetToBlockPrompt: (snippetId, blockId) => {
    set((state) => {
      const snippet = state.snippets.find((item) => item.id === snippetId)
      if (!snippet) {
        return state
      }

      return {
        project: touch({
          ...state.project,
          sections: state.project.sections.map((section) => ({
            ...section,
            items: section.items.map((block) =>
              block.id === blockId
                ? {
                    ...block,
                    prompt: appendSnippetContent(block.prompt, snippet.content),
                  }
                : block,
            ),
          })),
        }),
        revision: state.revision + 1,
      }
    })
  },
  applySnippetToTemplateField: (snippetId, fieldId) => {
    set((state) => {
      const snippet = state.snippets.find((item) => item.id === snippetId)
      if (!snippet) {
        return state
      }

      return {
        project: touch({
          ...state.project,
          templateFields: state.project.templateFields.map((field) =>
            field.id === fieldId
              ? {
                  ...field,
                  value: appendSnippetContent(field.value, snippet.content),
                }
              : field,
          ),
        }),
        revision: state.revision + 1,
      }
    })
  },
  addBlock: (type, insertionIndex) => {
    set((state) => {
      const block = createBlock(type)

      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        const safeIndex = Math.max(0, Math.min(section.items.length, insertionIndex))
        const items = [...section.items]
        items.splice(safeIndex, 0, block)

        return {
          ...section,
          items,
        }
      })

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedBlockId: block.id,
        revision: state.revision + 1,
      }
    })
  },
  addImageBlock: (dataUrl, insertionIndex) => {
    set((state) => {
      const block = createBlock('image_question')
      const assetId = newId()

      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        const safeIndex = Math.max(0, Math.min(section.items.length, insertionIndex))
        const items = [...section.items]
        items.splice(safeIndex, 0, { ...block, assetId } as QuestionBlockType)

        return {
          ...section,
          items,
        }
      })

      return {
        project: touch({
          ...state.project,
          assets: {
            ...state.project.assets,
            [assetId]: {
              id: assetId,
              kind: 'image',
              path: dataUrl,
            },
          },
          sections,
        }),
        selectedBlockId: block.id,
        revision: state.revision + 1,
      }
    })
  },
  updateBlock: (blockId, updater) => {
    set((state) => ({
      project: touch({
        ...state.project,
        sections: state.project.sections.map((section) => ({
          ...section,
          items: section.items.map((block) =>
            block.id === blockId ? updater(block) : block,
          ),
        })),
      }),
      revision: state.revision + 1,
    }))
  },
  moveBlockByDirection: (blockId, direction) => {
    const state = get()
    const items = getSectionItems(state.project, state.selectedSectionId)
    const index = items.findIndex((block) => block.id === blockId)

    if (index < 0) {
      return
    }

    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= items.length) {
      return
    }

    get().moveBlockByIndex(index, nextIndex)
  },
  moveBlockByIndex: (fromIndex, toIndex) => {
    set((state) => {
      if (fromIndex === toIndex) {
        return state
      }

      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= section.items.length ||
          toIndex >= section.items.length
        ) {
          return section
        }

        return {
          ...section,
          items: moveItem(section.items, fromIndex, toIndex),
        }
      })

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        revision: state.revision + 1,
      }
    })
  },
  duplicateBlock: (blockId) => {
    set((state) => {
      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        const index = section.items.findIndex((item) => item.id === blockId)
        if (index < 0) {
          return section
        }

        const cloned = {
          ...section.items[index],
          id: newId(),
        } as QuestionBlock
        const items = [...section.items]
        items.splice(index + 1, 0, cloned)

        return {
          ...section,
          items,
        }
      })

      const section = sections.find((item) => item.id === state.selectedSectionId)
      const index = section?.items.findIndex((item) => item.id === blockId) ?? -1
      const selected = index >= 0 ? section?.items[index + 1]?.id ?? null : state.selectedBlockId

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedBlockId: selected,
        revision: state.revision + 1,
      }
    })
  },
  deleteBlock: (blockId) => {
    set((state) => {
      const sections = state.project.sections.map((section) => {
        if (section.id !== state.selectedSectionId) {
          return section
        }

        return {
          ...section,
          items: section.items.filter((item) => item.id !== blockId),
        }
      })

      const currentSection = sections.find(
        (section) => section.id === state.selectedSectionId,
      )
      const selectedBlockId =
        currentSection?.items[0]?.id && state.selectedBlockId === blockId
          ? currentSection.items[0].id
          : state.selectedBlockId === blockId
            ? null
            : state.selectedBlockId

      return {
        project: touch({
          ...state.project,
          sections,
        }),
        selectedBlockId,
        revision: state.revision + 1,
      }
    })
  },
  selectBlock: (blockId) => set({ selectedBlockId: blockId }),
  attachImageAsset: (blockId, dataUrl) => {
    set((state) => {
      const assetId = newId()

      return {
        project: touch({
          ...state.project,
          assets: {
            ...state.project.assets,
            [assetId]: {
              id: assetId,
              kind: 'image',
              path: dataUrl,
            },
          },
          sections: state.project.sections.map((section) => ({
            ...section,
            items: section.items.map((block) => {
              if (block.id !== blockId || block.type !== 'image_question') {
                return block
              }

              return {
                ...block,
                assetId,
              }
            }),
          })),
        }),
        revision: state.revision + 1,
      }
    })
  },
  setProjectFileName: (name) => set({ projectFileName: name }),
  setSaveHandle: (handle) => set({ saveHandle: handle }),
  markProjectPersisted: (savedAt) => {
    set((state) => ({
      persistedRevision: state.revision,
      lastSavedAt: savedAt ?? new Date().toISOString(),
    }))
  },
}))

export const selectCurrentSection = (state: ExamStoreState) =>
  state.project.sections.find((section) => section.id === state.selectedSectionId) ??
  state.project.sections[0]

export const selectCurrentItems = (state: ExamStoreState) =>
  selectCurrentSection(state)?.items ?? []

export const selectSelectedBlock = (state: ExamStoreState) => {
  const items = selectCurrentItems(state)
  return items.find((item) => item.id === state.selectedBlockId) ?? null
}

export const selectIsDirty = (state: ExamStoreState) =>
  state.revision !== state.persistedRevision

export const selectQuestionBank = (state: ExamStoreState) => state.questionBank

export const selectSnippets = (state: ExamStoreState) => state.snippets
