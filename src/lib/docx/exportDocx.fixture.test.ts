import {
  createLargeImageStressFixture,
  createPaginationStressFixture,
} from '@/test/fixtures/exams'

import { buildExamDocx } from './exportDocx'

describe('docx export fixtures', () => {
  it('exports long fixture to non-empty blob', async () => {
    const fixture = createPaginationStressFixture()

    const blob = await buildExamDocx(fixture)

    expect(blob.size).toBeGreaterThan(3000)
  })

  it('exports oversized image fixture without throwing', async () => {
    const blob = await buildExamDocx(createLargeImageStressFixture())

    expect(blob.size).toBeGreaterThan(1000)
  })
})
