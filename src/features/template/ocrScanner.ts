import { createWorker, type Worker } from 'tesseract.js'
import type { TemplateField } from '@/types/exam'
import { newId } from '@/lib/utils/id'

type LayoutRegion = 'header' | 'body' | 'footer'

type DetectedBlock = {
  region: LayoutRegion
  text: string
  bbox: { x0: number; y0: number; x1: number; y1: number }
  confidence: number
}

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
  const size = Math.max(32, Math.floor(Math.min(image.width, image.height) * 0.14))
  const x = Math.floor(image.width * 0.5 - size / 2)
  const y = Math.floor(image.height * 0.04)

  return cropDataUrl(image, x, y, size, size)
}

const analyzeLayout = (
  lines: Array<{ text: string; bbox: { x0: number; y0: number; x1: number; y1: number }; confidence: number }>,
  imageHeight: number,
): DetectedBlock[] => {
  if (lines.length === 0) return []

  const sorted = [...lines].sort((a, b) => a.bbox.y0 - b.bbox.y0)

  const headerThreshold = imageHeight * 0.22
  const footerThreshold = imageHeight * 0.82

  const blocks: DetectedBlock[] = []

  let currentRegion: LayoutRegion | null = null
  let currentBlock: DetectedBlock | null = null

  for (const line of sorted) {
    const yMid = (line.bbox.y0 + line.bbox.y1) / 2

    let region: LayoutRegion
    if (yMid < headerThreshold) {
      region = 'header'
    } else if (yMid > footerThreshold) {
      region = 'footer'
    } else {
      region = 'body'
    }

    if (region === 'header' || region === 'footer') {
      if (currentRegion === region && currentBlock) {
        currentBlock.text += ' ' + line.text
        currentBlock.bbox.x0 = Math.min(currentBlock.bbox.x0, line.bbox.x0)
        currentBlock.bbox.y0 = Math.min(currentBlock.bbox.y0, line.bbox.y0)
        currentBlock.bbox.x1 = Math.max(currentBlock.bbox.x1, line.bbox.x1)
        currentBlock.bbox.y1 = Math.max(currentBlock.bbox.y1, line.bbox.y1)
        currentBlock.confidence = Math.max(currentBlock.confidence, line.confidence)
      } else {
        if (currentBlock && currentRegion) {
          blocks.push({ ...currentBlock, region: currentRegion })
        }
        currentRegion = region
        currentBlock = {
          region,
          text: line.text,
          bbox: { x0: line.bbox.x0, y0: line.bbox.y0, x1: line.bbox.x1, y1: line.bbox.y1 },
          confidence: line.confidence,
        }
      }
    } else {
      if (currentBlock && currentRegion) {
        blocks.push({ ...currentBlock, region: currentRegion })
      }
      currentRegion = null
      currentBlock = null
    }
  }

  if (currentBlock && currentRegion) {
    blocks.push({ ...currentBlock, region: currentRegion })
  }

  return blocks
}

const headToLabelPatterns: Array<{
  patterns: RegExp[]
  label: string
  key: string
  section: 'header' | 'footer'
}> = [
  {
    patterns: [
      /پەیمانگ[اە]\w*/i, /زانکۆ/i, /کۆلێج/i, /بەش/i,
      /university/i, /college/i, /institute/i, /school/i,
      /department/i, /ministry/i, /faculty/i,
    ],
    label: 'Institution Name (Kurdish)',
    key: 'institutionName',
    section: 'header',
  },
  {
    patterns: [/بابەت/i, /subject/i, /course/i],
    label: 'Subject',
    key: 'subject',
    section: 'header',
  },
  {
    patterns: [/قۆناغ/i, /stage/i, /level/i, /class/i],
    label: 'Stage',
    key: 'level',
    section: 'header',
  },
  {
    patterns: [/بەش\s*[:/]/i, /department/i],
    label: 'Department',
    key: 'department',
    section: 'header',
  },
  {
    patterns: [/كات/i, /کاتژمێر/i, /duration/i, /time/i, /min(?:ute)?s?/i],
    label: 'Duration',
    key: 'examDuration',
    section: 'header',
  },
  {
    patterns: [/خوول/i, /round/i, /attempt/i, /کۆتایی/i, /midterm/i, /final/i, /semester/i],
    label: 'Round',
    key: 'term',
    section: 'header',
  },
  {
    patterns: [/\d{4}\s*[-–]\s*\d{4}/, /academic\s*year/i, /ساڵ/i],
    label: 'Academic Year',
    key: 'academicYear',
    section: 'header',
  },
  {
    patterns: [/سەرکەوتن/i, /good\s*luck/i, /best\s*(of\s*)?luck/i, /بەهیوا/i],
    label: 'Footer Blessing',
    key: 'footerBlessing',
    section: 'footer',
  },
  {
    patterns: [/مامۆستا/i, /lecturer/i, /examiner/i, /واژوو/i],
    label: 'Lecturer Signature',
    key: 'lecturerSignature',
    section: 'footer',
  },
]

const matchBlockToField = (
  block: DetectedBlock,
): { label: string; key: string; section: 'header' | 'footer' } | null => {
  for (const entry of headToLabelPatterns) {
    if (entry.section !== block.region) continue
    for (const pattern of entry.patterns) {
      if (pattern.test(block.text)) {
        return { label: entry.label, key: entry.key, section: entry.section }
      }
    }
  }
  return null
}

function geometricTraceFallback(
  dataUrl: string,
  onProgress?: (progress: number, status: string) => void,
): TemplateField[] {
  if (onProgress) onProgress(40, 'Performing geometric layout trace...')

  const img = new Image()
  img.src = dataUrl

  const guessedLogoUrl = traceLikelyLogo(img)

  if (onProgress) onProgress(90, 'Building template fields from layout...')
  const fields: TemplateField[] = []
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Cover Page Image',
    value: dataUrl,
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'center' },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Institution Logo',
    value: guessedLogoUrl,
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'center' },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Top Strip Left',
    value: '',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'left', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Top Strip Right',
    value: '',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Institution Name',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'center', bold: true, fontSizePt: 16 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Examination Banner',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'center', bold: true, fontSizePt: 14 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Subject',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Department',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Stage',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Duration',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Academic Year',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'center', bold: true, fontSizePt: 14 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Round',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'center', bold: true, fontSizePt: 14 },
  })
  fields.push({
    id: newId(),
    section: 'header',
    label: 'Course Metadata',
    value: '',
    displayMode: 'label_value',
    locked: false,
    style: { alignment: 'right', fontSizePt: 11 },
  })
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

export async function scanTemplateImage(
  dataUrl: string,
  onProgress?: (progress: number, status: string) => void,
): Promise<TemplateField[]> {
  if (onProgress) onProgress(5, 'Initializing OCR engine...')

  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load template image'))
    img.src = dataUrl
  })

  if (onProgress) onProgress(10, 'Loading OCR language data...')

  let worker: Worker | null = null
  try {
    worker = await createWorker('ara+eng')
    if (onProgress) onProgress(20, 'Recognizing text in template image...')
    const ocrResult = await worker.recognize(dataUrl)

    if (onProgress) onProgress(50, 'Analyzing page layout...')

    const allLines: Array<{ text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }> = []

    if (ocrResult.data.blocks) {
      for (const block of ocrResult.data.blocks) {
        if (block.paragraphs) {
          for (const paragraph of block.paragraphs) {
            if (paragraph.lines) {
              for (const line of paragraph.lines) {
                if (line.text.trim().length > 1 && line.confidence > 30) {
                  allLines.push({
                    text: line.text.trim(),
                    confidence: line.confidence,
                    bbox: line.bbox,
                  })
                }
              }
            }
          }
        }
      }
    }

    const detectedBlocks = analyzeLayout(allLines, img.height)

    if (onProgress) onProgress(70, 'Mapping recognized text to template fields...')

    const fields: TemplateField[] = []

    fields.push({
      id: newId(),
      section: 'header',
      label: 'Cover Page Image',
      value: dataUrl,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center' },
    })

    const guessedLogoUrl = traceLikelyLogo(img)
    fields.push({
      id: newId(),
      section: 'header',
      label: 'Institution Logo',
      value: guessedLogoUrl,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center' },
    })

    fields.push({
      id: newId(),
      section: 'header',
      label: 'Top Strip Left',
      value: '',
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'left', fontSizePt: 11 },
    })

    fields.push({
      id: newId(),
      section: 'header',
      label: 'Top Strip Right',
      value: '',
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'right', fontSizePt: 11 },
    })

    const mappedBlocks = new Map<string, DetectedBlock>()
    for (const block of detectedBlocks) {
      const match = matchBlockToField(block)
      const key = match?.key ?? `ocr-${block.region}-${block.text.slice(0, 30)}`
      if (!mappedBlocks.has(key)) {
        mappedBlocks.set(key, block)
      }
    }

    for (const [, block] of mappedBlocks) {
      const match = matchBlockToField(block)
      const label =
        match?.label ??
        `${block.region === 'header' ? 'Header' : 'Footer'}: ${block.text.slice(0, 40)}`
      const xCenter = (block.bbox.x0 + block.bbox.x1) / 2
      const imgCenter = img.width / 2
      const alignment =
        xCenter < imgCenter * 0.4
          ? ('left' as const)
          : xCenter > imgCenter * 0.6
            ? ('right' as const)
            : ('center' as const)

      const section: 'header' | 'footer' =
        match?.section ?? (block.region === 'header' ? 'header' : 'footer')

      fields.push({
        id: newId(),
        key: match?.key,
        section,
        label,
        value: block.text,
        displayMode: 'value_only',
        locked: false,
        style: {
          alignment,
          fontSizePt: 11,
          position: {
            x: Math.round(block.bbox.x0),
            y: Math.round(block.bbox.y0),
            width: Math.round(block.bbox.x1 - block.bbox.x0),
            height: Math.round(block.bbox.y1 - block.bbox.y0),
          },
        },
      })
    }

    if (detectedBlocks.length < 3) {
      for (const entry of headToLabelPatterns) {
        const alreadyExists = fields.some((f) => f.key === entry.key)
        if (!alreadyExists) {
          fields.push({
            id: newId(),
            key: entry.key,
            section: entry.section,
            label: entry.label,
            value: '',
            displayMode: 'value_only',
            locked: false,
            style: {
              alignment: entry.section === 'header' ? 'right' : 'center',
              fontSizePt: 11,
            },
          })
        }
      }
    }

    fields.push({
      id: newId(),
      section: 'footer',
      label: 'Page Number',
      value: 'Page {page} of {totalPages}',
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center', fontSizePt: 10 },
    })

    if (onProgress) onProgress(100, 'Template scan complete.')

    await worker.terminate()
    return fields
  } catch {
    if (worker) {
      try {
        await worker.terminate()
      } catch {
        // ignore termination errors
      }
    }
    return geometricTraceFallback(dataUrl, onProgress)
  }
}
