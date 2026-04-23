import {
  createLargeImageStressFixture,
  createPaginationStressFixture,
  tinyPngDataUrl,
} from '@/test/fixtures/exams'
import type { ExamProject } from '@/types/exam'

import { buildExamPdfDocument, resolvePdfImageFit } from './exportPdf'

describe('pdf export fixtures', () => {
  it('creates multiple pages for long fixture', async () => {
    const fixture = createPaginationStressFixture()

    const document = await buildExamPdfDocument(fixture)

    expect(document.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('fits oversized image into printable bounds', async () => {
    const fixture = createLargeImageStressFixture()
    await buildExamPdfDocument(fixture)

    const asset = fixture.assets['asset-large-1']
    const fitted = resolvePdfImageFit({
      sourceWidth: asset.width ?? 4800,
      sourceHeight: asset.height ?? 3200,
      size: 'large',
      availableHeight: 245,
    })

    expect(fitted.width).toBeLessThanOrEqual(130)
    expect(fitted.height).toBeLessThanOrEqual(245)
  })

  it('renders the Shaqlawa cover as image content on the first page', async () => {
    const project: ExamProject = {
      id: 'shaqlawa-cover-regression',
      version: 1,
      settings: {
        templatePresetId: 'shaqlawa_linux_gui',
        numberingMode: 'global',
        targetTotalMarks: 10,
      },
      templateFields: [
        {
          id: 'cover',
          section: 'header',
          label: 'Cover Page Image',
          value: tinyPngDataUrl,
          displayMode: 'value_only',
        },
      ],
      sections: [
        {
          id: 'section-1',
          title: 'Q1/ Choose the right answer:',
          instructions: '(10 marks)',
          items: [
            {
              id: 'q1',
              type: 'mcq',
              prompt: 'Mobile OS based on Linux',
              options: ['Android', 'Windows', 'MacOS', 'Linux'],
              marks: 2,
            },
          ],
        },
      ],
      assets: {},
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    }

    const document = await buildExamPdfDocument(project)
    const firstPage = (document.internal.pages[1] ?? []) as unknown as string[]
    const pageText = firstPage.join('\n')

    expect(pageText).toContain('Do')
    expect(pageText).not.toMatch(/Top Strip Left|Institution Name \(Kurdish\)/)
  }, 15000)
})
