import { scanTemplateImage } from './ocrScanner'

describe('scanTemplateImage', () => {
  it('creates layout-first template fields with exact cover image preservation', async () => {
    const originalImage = globalThis.Image
    const originalCreateElement = document.createElement.bind(document)

    class MockImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      width = 1200
      height = 1800
      src = ''

      constructor() {
        queueMicrotask(() => this.onload?.())
      }
    }

    let toDataUrlCall = 0

    try {
      document.createElement = ((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: () => {},
            }),
            toDataURL: () => {
              toDataUrlCall += 1
              return `data:image/png;base64,logo-${toDataUrlCall}`
            },
          } as unknown as HTMLCanvasElement
        }

        return originalCreateElement(tagName)
      }) as typeof document.createElement

      globalThis.Image = MockImage as unknown as typeof Image

      const progress: number[] = []
      const sourceDataUrl = 'data:image/png;base64,source-template'

      const fields = await scanTemplateImage(sourceDataUrl, (value) => {
        progress.push(value)
      })

      expect(fields.some((field) => field.label === 'Cover Page Image' && field.value === sourceDataUrl)).toBe(true)
      expect(fields.some((field) => field.label === 'Institution Logo' && field.value.startsWith('data:image/png;base64,logo-'))).toBe(true)
      expect(fields.some((field) => field.label === 'Page Number')).toBe(true)
      expect(progress.at(-1)).toBe(100)
    } finally {
      globalThis.Image = originalImage
      document.createElement = originalCreateElement
    }
  })
})
