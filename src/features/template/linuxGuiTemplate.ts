import { applyTemplatePreset } from '@/features/template/templateLibrary'
import { newId } from '@/lib/utils/id'
import type { ExamProject } from '@/types/exam'

export const createShaqlawaLinuxGuiProject = (): ExamProject => {
  const now = new Date().toISOString()

  const baseProject: ExamProject = {
    id: newId(),
    version: 1,
    projectVersion: 1,
    versionHistory: [],
    settings: {
      templatePresetId: 'shaqlawa_linux_gui',
      targetTotalMarks: 60,
      numberingMode: 'global',
    },
    templateFields: [],
    sections: [],
    assets: {},
    createdAt: now,
    updatedAt: now,
  }

  return applyTemplatePreset(baseProject, 'shaqlawa_linux_gui')
}
