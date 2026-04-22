import { create } from 'zustand'

import { createBlock } from '@/features/questions/blockFactory'
import { createDefaultProject } from '@/features/template/defaultTemplate'
import type { SaveHandle } from '@/lib/file-system/projectFile'
import { newId } from '@/lib/utils/id'
import type {
  BlockType,
  ExamProject,
  QuestionBlock,
  QuestionBlock as QuestionBlockType,
  TemplateField,
} from '@/types/exam'

type Screen = 'home' | 'editor'

type ExamStoreState = {
  project: ExamProject
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
  openProject: (project: ExamProject, fileName?: string) => void
  addTemplateField: (section: 'header' | 'footer') => void
  updateTemplateField: (
    id: string,
    updates: Partial<
      Pick<TemplateField, 'label' | 'value' | 'displayMode' | 'style'>
    >,
  ) => void
  removeTemplateField: (id: string) => void
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

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const cloned = [...items]
  const [moved] = cloned.splice(fromIndex, 1)
  cloned.splice(toIndex, 0, moved)
  return cloned
}

const getSectionItems = (project: ExamProject, sectionId: string) => {
  const section = project.sections.find((item) => item.id === sectionId)
  return section?.items ?? []
}

export const useExamStore = create<ExamStoreState>((set, get) => ({
  project: defaultProject,
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
  openProject: (project, fileName) => {
    set({
      project,
      selectedSectionId: project.sections[0]?.id ?? '',
      selectedBlockId: project.sections[0]?.items[0]?.id ?? null,
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
                ...updates,
                style: updates.style ? { ...f.style, ...updates.style } : f.style,
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
        templateFields: state.project.templateFields.filter((f) => f.id !== id),
      }),
      revision: state.revision + 1,
    }))
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
