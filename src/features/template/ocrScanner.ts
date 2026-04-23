import Tesseract from 'tesseract.js'
import type { TemplateField } from '@/types/exam'
import { newId } from '@/lib/utils/id'

export async function scanTemplateImage(
  dataUrl: string,
  onProgress?: (progress: number, status: string) => void
): Promise<TemplateField[]> {
  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = dataUrl
  })

  // 1. Crop the header (Top 20% of the page)
  const canvas = document.createElement('canvas')
  const cropHeight = Math.floor(img.height * 0.20)
  canvas.width = img.width
  canvas.height = cropHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2d context')
  ctx.drawImage(img, 0, 0, img.width, cropHeight, 0, 0, img.width, cropHeight)
  
  const headerDataUrl = canvas.toDataURL('image/png')

  // 2. Crop top-left 15% to guess the logo
  // Typical aspect ratio 1:1 for logo
  const logoSize = Math.floor(img.width * 0.15)
  const logoCanvas = document.createElement('canvas')
  logoCanvas.width = logoSize
  logoCanvas.height = logoSize
  const logoCtx = logoCanvas.getContext('2d')
  if (logoCtx) {
      logoCtx.drawImage(img, 0, 0, logoSize, logoSize, 0, 0, logoSize, logoSize)
  }
  const guessedLogoUrl = logoCanvas.toDataURL('image/png')

  // 3. Run Tesseract on the Header portion
  if (onProgress) onProgress(0, 'Initializing OCR engine...')
  const result = await Tesseract.recognize(headerDataUrl, 'eng+ara', {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100), 'Scanning text...')
      }
    }
  })

  // Tesseract data object structure handle
  const lines: string[] = (result.data as any).lines?.map((l: any) => l.text.trim()).filter(Boolean) || []

  // 4. Heuristics to map to Institution Block, Class Metadata, Session Banner
  let institution = 'Detected Institution'
  let banner = 'Midterm Examination'
  
  // Use regex to find specific common elements in exams
  const textBlob = lines.join('\n')
  
  const extract = (pattern: RegExp) => {
    const match = textBlob.match(pattern)
    return match ? match[1].trim() : ''
  }
  
  const academicYear = extract(/(?:Academic\s*Year|Year)[\s:-]+([0-9\-\s/]+)/i)
  const subject = extract(/(?:Subject|Course)[\s:-]+([A-Za-z0-9\s-]+)/i)
  const time = extract(/(?:Time|Duration)[\s:-]+([0-9\s]+(?:Hours|Mins|Hrs|Min|H|M|hr)?)/i)
  const date = extract(/(?:Date)[\s:-]+([0-9/.-]+)/i)
  const department = extract(/(?:Department|Dept\.?)[\s:-]+([A-Za-z\s]+)/i)
  const lecturer = extract(/(?:Lecturer|Teacher)[\s:-]+([A-Za-z\s]+)/i)
  const classLevel = extract(/(?:Class|Stage|Level|Stage\s*Name)[\s:-]+([A-Za-z0-9\s]+)/i)

  // Filtering out those matched lines so we don't duplicate them
  const isMetadataLine = (l: string) => {
    const lg = l.toLowerCase()
    return lg.includes('academic') || lg.includes('subject') || lg.includes('time') || 
           lg.includes('date') || lg.includes('department') || lg.includes('lecturer') || 
           lg.includes('class') || lg.includes('stage') || lg.includes('course')
  }

  const unassignedLines = lines.filter(l => !isMetadataLine(l))

  if (unassignedLines.length > 0) {
    institution = unassignedLines[0]
  }
  
  const possibleBanners = ['exam', 'midterm', 'quiz', 'test', 'final', 'assessment']
  const bannerLineIndex = unassignedLines.findIndex(l => possibleBanners.some(b => l.toLowerCase().includes(b)))
  
  if (bannerLineIndex !== -1 && bannerLineIndex !== 0) {
    banner = unassignedLines[bannerLineIndex]
  } else if (unassignedLines.length > 1) {
    banner = unassignedLines[1]
  }

  // Generate fields
  const fields: TemplateField[] = [
    {
      id: newId(),
      section: 'header',
      label: 'Institution Logo',
      value: guessedLogoUrl, // Auto-placed logo
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center' }
    },
    {
      id: newId(),
      section: 'header',
      label: 'Institution Name',
      value: institution,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 16 }
    },
    {
      id: newId(),
      section: 'header',
      label: 'Examination Banner',
      value: banner,
      displayMode: 'value_only',
      locked: false,
      style: { alignment: 'center', bold: true, fontSizePt: 14 }
    }
  ]

  let hasAddedFields = false
  const addField = (label: string, val: string) => {
    if (val) {
      fields.push({ id: newId(), section: 'header', label, value: val, displayMode: 'label_value', locked: false, style: { fontSizePt: 11 } })
      hasAddedFields = true
    }
  }

  addField('Academic Year', academicYear)
  addField('Subject', subject)
  addField('Time', time)
  addField('Date', date)
  addField('Department', department)
  addField('Class', classLevel)
  addField('Lecturer', lecturer)

  if (!hasAddedFields) {
      fields.push({ id: newId(), section: 'header', label: 'Name', value: '___________________', displayMode: 'label_value', locked: false, style: { fontSizePt: 11 } })
      fields.push({ id: newId(), section: 'header', label: 'Date', value: '__________', displayMode: 'label_value', locked: false, style: { fontSizePt: 11 } })
  }

  // Footer default
  fields.push({
    id: newId(),
    section: 'footer',
    label: 'Page Number',
    value: 'Page {page} of {totalPages}',
    displayMode: 'value_only',
    locked: false,
    style: { alignment: 'center', fontSizePt: 10 }
  })

  return fields
}
