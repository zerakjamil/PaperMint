import { fitWithinBox, getImageTypeFromDataUrl } from './exportLayout'

describe('export layout helpers', () => {
  it('scales down oversized images while preserving aspect ratio', () => {
    const fitted = fitWithinBox(
      { width: 2400, height: 1200 },
      { width: 600, height: 400 },
    )

    expect(fitted.width).toBe(600)
    expect(fitted.height).toBe(300)
  })

  it('respects max height when image is very tall', () => {
    const fitted = fitWithinBox(
      { width: 1200, height: 3600 },
      { width: 500, height: 700 },
    )

    expect(fitted.height).toBe(700)
    expect(fitted.width).toBe(233)
  })

  it('does not upscale when upscaling is disabled', () => {
    const fitted = fitWithinBox(
      { width: 300, height: 180 },
      { width: 1000, height: 700 },
    )

    expect(fitted.width).toBe(300)
    expect(fitted.height).toBe(180)
  })

  it('normalizes image type from data url', () => {
    expect(getImageTypeFromDataUrl('data:image/png;base64,abc')).toBe('png')
    expect(getImageTypeFromDataUrl('data:image/jpeg;base64,abc')).toBe('jpg')
    expect(getImageTypeFromDataUrl('data:image/webp;base64,abc')).toBe('png')
  })
})
