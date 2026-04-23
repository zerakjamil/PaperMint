import { createDefaultProject } from '@/features/template/defaultTemplate'

import { buildExamWarnings, computePaperMarks, computeSectionMarks } from './examValidation'

describe('exam validation', () => {
  it('computes section and paper marks totals', () => {
    const project = createDefaultProject()
    project.sections[0]!.items[0]!.marks = 10

    const sections = computeSectionMarks(project)
    const paper = computePaperMarks(project)

    expect(sections[0]?.total).toBe(10)
    expect(paper).toBe(10)
  })

  it('flags marks mismatch against target', () => {
    const project = createDefaultProject()
    project.settings = { ...project.settings, targetTotalMarks: 50 }
    project.sections[0]!.items[0]!.marks = 10

    const warnings = buildExamWarnings(project)
    const mismatch = warnings.find((warning) => warning.id === 'marks-mismatch')
    expect(mismatch).toBeDefined()
    expect(mismatch?.target?.kind).toBe('marks')
  })

  it('flags missing image asset as export-blocking error', () => {
    const project = createDefaultProject()
    project.sections[0]!.items = [
      {
        id: 'img-1',
        type: 'image_question',
        prompt: 'Use diagram',
        assetId: 'missing',
      },
    ]

    const warnings = buildExamWarnings(project)
    const missing = warnings.find((warning) => warning.id === 'missing-image-img-1')

    expect(missing?.level).toBe('error')
    expect(missing?.target).toEqual({
      kind: 'block',
      blockId: 'img-1',
      sectionId: project.sections[0]!.id,
    })
  })

  it('builds template metadata warnings with field jump target', () => {
    const project = createDefaultProject()
    project.templateFields[0]!.value = ''

    const warnings = buildExamWarnings(project)
    const metadataWarning = warnings.find((warning) =>
      warning.id.startsWith('missing-header-metadata-'),
    )

    expect(metadataWarning).toBeDefined()
    expect(metadataWarning?.target).toEqual({
      kind: 'template_field',
      fieldId: project.templateFields[0]!.id,
    })
  })
})
