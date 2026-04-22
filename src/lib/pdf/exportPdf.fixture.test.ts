import {
  createLargeImageStressFixture,
  createPaginationStressFixture,
} from '@/test/fixtures/exams'

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
})
