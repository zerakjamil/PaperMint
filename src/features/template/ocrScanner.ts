import type { TemplateField } from '@/types/exam'
import { newId } from '@/lib/utils/id'

const cropDataUrl = (
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.floor(width))
  canvas.height = Math.max(1, Math.floor(height))

  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('No 2d context')
  }

  ctx.drawImage(
    image,
    Math.max(0, Math.floor(x)),
    Math.max(0, Math.floor(y)),
    Math.max(1, Math.floor(width)),
    Math.max(1, Math.floor(height)),
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return canvas.toDataURL('image/png')
}

const traceLikelyLogo = (image: HTMLImageElement) => {
  // Most institutional logos are near the top center and close to square.
  const size = Math.max(32, Math.floor(Math.min(image.width, image.height) * 0.14))
  const x = Math.floor(image.width * 0.5 - size / 2)
  const y = Math.floor(image.height * 0.04)

  return cropDataUrl(image, x, y, size, size)
}

export async function scanTemplateImage(
  dataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<TemplateField[]> {
  if (onProgress) onProgress(5, 'Reading uploaded template image...')

  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = dataUrl
  })

  if (onProgress) onProgress(35, 'Tracing full-page template geometry...')

  const guessedLogoUrl = traceLikelyLogo(img)

  if (onProgress) onProgress(75, 'Building editable template fields...')

  // Layout-first algorithm:
  // 1) Preserve full uploaded page exactly as Cover Page Image (no OCR distortion).
  // 2) Attach a best-effort logo crop users can replace in one click.
  // 3) Add light metadata placeholders for editable packs.
  const fields: TemplateField[] = [
    {
      id: newId(),
      section: 'header',
      label: 'Cover Page Image',
      value: dataUrl,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center' },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Institution Logo',
      value: guessedLogoUrl,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center' },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Top Strip Left',
      value: '',
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'left', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Top Strip Right',
      value: '',
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Institution Name',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 16 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Examination Banner',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 14 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Subject',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Department',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Stage',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Duration',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Academic Year',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 14 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Round',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 14 },
    },
    {
      id: newId(),
      section: 'header',
      label: 'Course Metadata',
      value: '',
      displayMode: 'label_value',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    },
  ]

  // Footer default
  fields.push({
    id: newId(),
    section: 'footer',
    label: 'Footer Blessing',
    value: '',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'center', fontSizePt: 12 },
  })

  fields.push({
    id: newId(),
    section: 'footer',
    label: 'Lecturer Signature',
    value: '',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'right', fontSizePt: 10 },
  })

  fields.push({
    id: newId(),
    section: 'footer',
    label: 'Page Number',
    value: 'Page {page} of {totalPages}',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'center', fontSizePt: 10 },
  })

  if (onProgress) onProgress(100, 'Template trace complete.')

  return fields
}
