import { describe, expect, it } from 'vitest'

import { createDefaultProject } from '@/features/template/defaultTemplate'

import { parseTemplatePack, serializeTemplatePack } from './templatePack'

describe('template pack utilities', () => {
  it('serializes and parses template fields', () => {
    const project = createDefaultProject()

    const serialized = serializeTemplatePack({
      templateFields: project.templateFields,
      templatePresetId: project.settings?.templatePresetId,
    })

    const parsed = parseTemplatePack(serialized)

    expect(parsed.version).toBe(1)
    expect(parsed.templateFields).toHaveLength(project.templateFields.length)
    expect(parsed.templatePresetId).toBe(project.settings?.templatePresetId)
  })

  it('throws on invalid pack payload', () => {
    expect(() => parseTemplatePack('{"version":2}')).toThrow(
      'Template pack format is invalid.',
    )
  })
})
