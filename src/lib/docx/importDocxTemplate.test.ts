import {
  mapDocxImportToProject,
  type DocxImportPayload,
} from '@/lib/docx/importDocxTemplate'

const makeBlock = (overrides: Partial<DocxImportPayload['headers'][number]>) => ({
  source: 'word/header1.xml',
  text: '',
  alignment: 'left',
  segments: [],
  images: [],
  ...overrides,
})

describe('mapDocxImportToProject', () => {
  it('maps placeholder-like header/footer content into editable fields', () => {
    const payload: DocxImportPayload = {
      headers: [
        makeBlock({
          text: 'Date: {{exam_date}}',
          alignment: 'center',
          segments: [
            {
              text: 'Date: {{exam_date}}',
              bold: true,
              italics: false,
              underline: false,
              fontSizePt: 14,
              fontFamily: 'Times New Roman',
              colorHex: '333333',
            },
          ],
        }),
        makeBlock({
          text: '',
          images: [
            {
              sourcePath: 'word/media/logo.png',
              mime: 'image/png',
              dataUrl: 'data:image/png;base64,AAAA',
              altText: 'School Logo',
            },
          ],
        }),
      ],
      footers: [makeBlock({ source: 'word/footer1.xml', text: 'Invigilator: [teacher_name]' })],
      body: [
        makeBlock({ source: 'word/document.xml', text: '1. Define photosynthesis.' }),
        makeBlock({ source: 'word/document.xml', text: '2) Explain chloroplast function.' }),
        makeBlock({ source: 'word/document.xml', text: 'Read all questions carefully before answering.' }),
      ],
      warnings: [],
    }

    const imported = mapDocxImportToProject(payload, 'template.docx')

    const dateField = imported.project.templateFields.find(
      (field) => field.section === 'header' && field.label === 'Date',
    )
    expect(dateField?.value).toBe('')
    expect(dateField?.style?.alignment).toBe('center')
    expect(dateField?.style?.bold).toBe(true)
    expect(dateField?.style?.fontSizePt).toBe(14)
    expect(dateField?.style?.fontFamily).toBe('Times New Roman')

    const footerField = imported.project.templateFields.find(
      (field) => field.section === 'footer' && field.label === 'Invigilator',
    )
    expect(footerField?.value).toBe('')

    const imageField = imported.project.templateFields.find(
      (field) => field.value.startsWith('data:image/png;base64,'),
    )
    expect(imageField?.label).toBe('School Logo')

    expect(imported.project.sections[0]?.items).toHaveLength(2)
    expect(imported.project.sections[0]?.items[0]?.prompt).toBe('Define photosynthesis.')
    expect(imported.project.sections[0]?.instructions).toContain(
      'Read all questions carefully before answering.',
    )
  })

  it('adds fallback section when no body content is present', () => {
    const payload: DocxImportPayload = {
      headers: [],
      footers: [],
      body: [],
      warnings: ['No body paragraphs found.'],
    }

    const imported = mapDocxImportToProject(payload, 'empty.docx')

    expect(imported.project.sections).toHaveLength(1)
    expect(imported.project.sections[0]?.items).toHaveLength(1)
    expect(imported.project.sections[0]?.title).toBe('Section A')
    expect(imported.warnings).toContain('No editable header/footer fields were extracted.')
  })

  it('detects MCQ, true/false, and fill blank patterns from body content', () => {
    const payload: DocxImportPayload = {
      headers: [],
      footers: [],
      body: [
        makeBlock({ source: 'word/document.xml', text: '1) What is 2 + 2?' }),
        makeBlock({ source: 'word/document.xml', text: 'A. 2' }),
        makeBlock({ source: 'word/document.xml', text: 'B. 4' }),
        makeBlock({ source: 'word/document.xml', text: 'C. 6' }),
        makeBlock({ source: 'word/document.xml', text: '2. The Earth is flat. True/False' }),
        makeBlock({ source: 'word/document.xml', text: '3- Fill in the blank: Water boils at ____ C.' }),
      ],
      warnings: [],
    }

    const imported = mapDocxImportToProject(payload, 'patterns.docx')
    const items = imported.project.sections[0]?.items ?? []

    expect(items).toHaveLength(3)
    expect(items[0]?.type).toBe('mcq')
    expect(items[0]?.type === 'mcq' ? items[0].options : []).toEqual(['2', '4', '6'])
    expect(items[1]?.type).toBe('true_false')
    expect(items[2]?.type).toBe('fill_blank')
  })
})
