import { createBlock } from '@/features/questions/blockFactory'
import { applyTemplatePreset, getTemplatePreset } from '@/features/template/templateLibrary'
import { newId } from '@/lib/utils/id'
import type { ExamProject } from '@/types/exam'

export const createDefaultProject = (): ExamProject => {
  const now = new Date().toISOString()
  const preset = getTemplatePreset('default_university')

  const baseProject: ExamProject = {
    id: newId(),
    version: 1,
    projectVersion: 1,
    versionHistory: [],
    settings: {
      templatePresetId: preset.id,
      targetTotalMarks: 100,
      numberingMode: 'global',
    },
    templateFields: [],
    sections: [
      {
        id: newId(),
        title: 'Section A',
        instructions: 'Answer all questions in this section.',
        items: [createBlock('essay')],
      },
    ],
    assets: {},
    createdAt: now,
    updatedAt: now,
  }

  return applyTemplatePreset(baseProject, preset.id)
}
