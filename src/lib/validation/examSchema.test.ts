import { createDefaultProject } from '@/features/template/defaultTemplate'

import { examProjectSchema } from './examSchema'

describe('exam project schema phase 2 metadata', () => {
  it('accepts legacy projects without phase 2 metadata', () => {
    const project = createDefaultProject()

    const result = examProjectSchema.safeParse(project)

    expect(result.success).toBe(true)
  })

  it('accepts version history metadata when shape is valid', () => {
    const project = createDefaultProject()
    const withVersionMetadata = {
      ...project,
      projectVersion: 2,
      baseProjectId: 'project-root-1',
      versionHistory: [
        {
          id: 'v-1',
          versionNumber: 1,
          fileName: 'midterm-v1.exam.json',
          createdAt: project.createdAt,
          sourceProjectId: project.id,
        },
      ],
    }

    const result = examProjectSchema.safeParse(withVersionMetadata)

    expect(result.success).toBe(true)
  })

  it('rejects invalid version history metadata', () => {
    const project = createDefaultProject()
    const withInvalidVersionMetadata = {
      ...project,
      versionHistory: [
        {
          id: 'v-1',
          versionNumber: 0,
          createdAt: project.createdAt,
        },
      ],
    }

    const result = examProjectSchema.safeParse(withInvalidVersionMetadata)

    expect(result.success).toBe(false)
  })

  it('accepts instructor metadata on question blocks', () => {
    const project = createDefaultProject()
    project.sections[0]!.items[0] = {
      ...project.sections[0]!.items[0]!,
      instructorOnly: true,
      instructorNotes: 'Use rubric row 3 for partial credit.',
    }

    const result = examProjectSchema.safeParse(project)

    expect(result.success).toBe(true)
  })
})
