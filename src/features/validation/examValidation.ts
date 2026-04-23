import type { ExamProject, QuestionBlock } from '@/types/exam'

export type ValidationWarningLevel = 'warning' | 'error'

export type ValidationTarget =
  | { kind: 'template_field'; fieldId: string }
  | { kind: 'block'; blockId: string; sectionId: string }
  | { kind: 'section'; sectionId: string }
  | { kind: 'marks' }

export type ValidationWarning = {
  id: string
  level: ValidationWarningLevel
  message: string
  target?: ValidationTarget
}

const IMAGE_WARNING_THRESHOLD_BYTES = 2_000_000

const estimateDataUrlBytes = (value: string) => {
  if (!value.startsWith('data:') || !value.includes(',')) {
    return 0
  }

  const payload = value.split(',')[1] ?? ''
  return Math.floor((payload.length * 3) / 4)
}

const isMissingPrompt = (block: QuestionBlock) => block.prompt.trim().length === 0

const questionWarnings = (project: ExamProject): ValidationWarning[] => {
  const warnings: ValidationWarning[] = []

  project.sections.forEach((section) => {
    section.items.forEach((block, index) => {
      if (isMissingPrompt(block)) {
        warnings.push({
          id: `empty-${block.id}`,
          level: 'warning',
          message: `${section.title || 'Section'} Q${index + 1} has empty prompt.`,
          target: { kind: 'block', blockId: block.id, sectionId: section.id },
        })
      }

      if (block.prompt.length > 550) {
        warnings.push({
          id: `long-prompt-${block.id}`,
          level: 'warning',
          message: `${section.title || 'Section'} Q${index + 1} prompt very long; export may overflow pages.`,
          target: { kind: 'block', blockId: block.id, sectionId: section.id },
        })
      }

      if (block.type === 'mcq') {
        block.options.forEach((option, optionIndex) => {
          if (option.trim().length === 0) {
            warnings.push({
              id: `empty-option-${block.id}-${optionIndex}`,
              level: 'warning',
              message: `${section.title || 'Section'} Q${index + 1} option ${String.fromCharCode(65 + optionIndex)} empty.`,
              target: { kind: 'block', blockId: block.id, sectionId: section.id },
            })
          }

          if (option.length > 220) {
            warnings.push({
              id: `long-option-${block.id}-${optionIndex}`,
              level: 'warning',
              message: `${section.title || 'Section'} Q${index + 1} option ${String.fromCharCode(65 + optionIndex)} very long; export wrapping risk.`,
              target: { kind: 'block', blockId: block.id, sectionId: section.id },
            })
          }
        })
      }

      if (block.type === 'image_question') {
        const asset = project.assets[block.assetId]
        if (!asset?.path) {
          warnings.push({
            id: `missing-image-${block.id}`,
            level: 'error',
            message: `${section.title || 'Section'} Q${index + 1} image missing.`,
            target: { kind: 'block', blockId: block.id, sectionId: section.id },
          })
        } else if (estimateDataUrlBytes(asset.path) > IMAGE_WARNING_THRESHOLD_BYTES) {
          warnings.push({
            id: `large-image-${block.id}`,
            level: 'warning',
            message: `${section.title || 'Section'} Q${index + 1} image very large; PDF export may become heavy.`,
            target: { kind: 'block', blockId: block.id, sectionId: section.id },
          })
        }
      }
    })
  })

  return warnings
}

export const computeSectionMarks = (project: ExamProject) =>
  project.sections.map((section) => ({
    sectionId: section.id,
    title: section.title || 'Untitled Section',
    total: section.items.reduce((sum, block) => sum + (block.marks ?? 0), 0),
  }))

export const computePaperMarks = (project: ExamProject) =>
  computeSectionMarks(project).reduce((sum, section) => sum + section.total, 0)

export const buildExamWarnings = (project: ExamProject): ValidationWarning[] => {
  const warnings: ValidationWarning[] = []

  const missingTemplateValues = project.templateFields.filter(
    (field) => field.section === 'header' && field.value.trim().length === 0,
  )

  if (missingTemplateValues.length > 0) {
    missingTemplateValues.forEach((field) => {
      warnings.push({
        id: `missing-header-metadata-${field.id}`,
        level: 'warning',
        message: `Header metadata "${field.label}" is empty.`,
        target: { kind: 'template_field', fieldId: field.id },
      })
    })
  }

  warnings.push(...questionWarnings(project))

  const questionCount = project.sections.reduce(
    (sum, section) => sum + section.items.length,
    0,
  )

  if (questionCount === 0) {
    warnings.push({
      id: 'no-questions',
      level: 'error',
      message: 'Paper has no questions.',
      target: { kind: 'section', sectionId: project.sections[0]?.id ?? '' },
    })
  }

  const markedQuestions = project.sections.flatMap((section) => section.items)
  const missingMarksCount = markedQuestions.filter(
    (block) => block.marks === undefined,
  ).length

  if (missingMarksCount > 0) {
    warnings.push({
      id: 'missing-marks',
      level: 'warning',
      message: `${missingMarksCount} question(s) missing marks value.`,
      target: { kind: 'marks' },
    })
  }

  const target = project.settings?.targetTotalMarks
  const total = computePaperMarks(project)
  if (typeof target === 'number' && Number.isFinite(target) && target >= 0) {
    if (Math.abs(total - target) > 0.0001) {
      warnings.push({
        id: 'marks-mismatch',
        level: 'warning',
        message: `Marks mismatch: paper total ${total} vs target ${target}.`,
        target: { kind: 'marks' },
      })
    }
  }

  return warnings
}
