import { jsPDF } from 'jspdf'

import { downloadBlob } from '@/lib/file-system/projectFile'
import {
  fitWithinBox,
  getImageDimensionsFromDataUrl,
  getImageTypeFromDataUrl,
  isImageSourceValue,
  resolveImageDataUrl,
} from '@/lib/utils/exportLayout'
import {
  getBlockAnswerText,
  getBlockInstructorNotes,
  shouldRenderBlockForMode,
} from '@/lib/export/exportMode'
import type { ExamProject, ExportMode, QuestionBlock } from '@/types/exam'

const margin = 20
const pageWidth = 210
const pageHeight = 297
const contentWidth = pageWidth - margin * 2
const contentBottom = pageHeight - margin

const imageWidthBySize = {
  small: 70,
  medium: 100,
  large: 130,
}

type SupportedImageSize = keyof typeof imageWidthBySize

type PdfWriteContext = {
  pdf: jsPDF
  y: number
}

const isImageTemplateValue = (value: string) => isImageSourceValue(value)

const findField = (fields: ExamProject['templateFields'], label: string) =>
  fields.find((field) => field.label === label)

const textValue = (field?: ExamProject['templateFields'][number]) => field?.value ?? ''

const createContext = (pdf: jsPDF): PdfWriteContext => ({
  pdf,
  y: margin,
})

const startNewPage = (context: PdfWriteContext) => {
  context.pdf.addPage('a4', 'portrait')
  context.y = margin
}

const ensureSpace = (context: PdfWriteContext, needed: number) => {
  if (context.y + needed <= contentBottom) {
    return
  }

  startNewPage(context)
}

const drawWrapped = ({
  context,
  text,
  x = margin,
  width = contentWidth,
  lineHeight = 6,
}: {
  context: PdfWriteContext
  text: string
  x?: number
  width?: number
  lineHeight?: number
}) => {
  const lines = context.pdf.splitTextToSize(text, width) as string[]

  lines.forEach((line) => {
    ensureSpace(context, lineHeight + 1)
    context.pdf.text(line, x, context.y)
    context.y += lineHeight
  })
}

const drawRule = (context: PdfWriteContext) => {
  ensureSpace(context, 8)
  context.pdf.setDrawColor(80)
  context.pdf.line(margin, context.y, pageWidth - margin, context.y)
  context.y += 8
}

const drawTemplateImage = async (
  context: PdfWriteContext,
  source: string,
  maxWidth: number,
  maxHeight: number,
) => {
  const imageDataUrl = await resolveImageDataUrl(source)

  const sourceDimensions = await getImageDimensionsFromDataUrl(imageDataUrl).catch(
    () => ({ width: 1400, height: 800 }),
  )

  const fitted = fitWithinBox(sourceDimensions, {
    width: maxWidth,
    height: maxHeight,
  })

  ensureSpace(context, fitted.height + 6)
  const x = margin + (contentWidth - fitted.width) / 2
  const format = getImageTypeFromDataUrl(imageDataUrl) === 'jpg' ? 'JPEG' : 'PNG'
  context.pdf.addImage(imageDataUrl, format, x, context.y, fitted.width, fitted.height)
  context.y += fitted.height + 6
}

const drawShaqlawaCoverPage = async (pdf: jsPDF, fields: ExamProject['templateFields']) => {
  const topStripLeft = textValue(findField(fields, 'Top Strip Left'))
  const topStripRight = textValue(findField(fields, 'Top Strip Right'))
  const logoField = findField(fields, 'Institution Logo')

  pdf.addPage('a4', 'portrait')
  pdf.setFont('times', 'normal')

  pdf.setDrawColor(100)
  pdf.setLineWidth(0.6)

  pdf.rect(10, 10, 190, 277)
  pdf.rect(14, 14, 182, 14)
  pdf.setFontSize(9)
  pdf.text(topStripLeft, 17, 23, { align: 'left' })
  pdf.text(topStripRight, 190, 23, { align: 'right' })

  pdf.rect(14, 30, 182, 55)
  pdf.rect(14, 30, 56, 55)
  pdf.rect(74, 30, 44, 55)
  pdf.rect(122, 30, 74, 55)

  pdf.setFontSize(20)
  pdf.text(textValue(findField(fields, 'Cover Left Metadata')), 22, 56, { align: 'left' })

  if (logoField?.value) {
    const imageSource = await resolveImageDataUrl(logoField.value)
    const format = getImageTypeFromDataUrl(imageSource) === 'jpg' ? 'JPEG' : 'PNG'
    pdf.addImage(imageSource, format, 84, 38, 24, 24)
  }

  pdf.setFontSize(19)
  pdf.text(textValue(findField(fields, 'Session Banner')), 96, 60, { align: 'center' })

  pdf.setFontSize(11)
  pdf.text(textValue(findField(fields, 'Institution Name (Kurdish)')), 190, 43, {
    align: 'right',
    maxWidth: 68,
  })
  pdf.text(textValue(findField(fields, 'Institution Name (English)')), 190, 72, {
    align: 'right',
    maxWidth: 68,
  })
  pdf.text(textValue(findField(fields, 'Course Metadata')), 190, 85, {
    align: 'right',
    maxWidth: 68,
  })

  pdf.rect(14, 89, 182, 13)
  pdf.rect(14, 89, 150, 13)
  pdf.rect(168, 89, 28, 13)
  pdf.setFontSize(9)
  pdf.text(textValue(findField(fields, 'Student Serial Label')), 182, 98, {
    align: 'center',
    maxWidth: 20,
  })

  pdf.rect(14, 106, 182, 103)
  pdf.rect(14, 106, 124, 12)
  pdf.rect(138, 106, 26, 12)
  pdf.rect(164, 106, 32, 12)
  pdf.rect(14, 118, 124, 91)
  pdf.rect(138, 118, 26, 91)
  pdf.rect(164, 118, 32, 91)
  pdf.text('كۆی گشتی نمرهكە', 78, 114, { align: 'center' })
  pdf.text('واژووی وردبین', 151, 114, { align: 'center' })
  pdf.text('واژووی مامۆستا', 180, 114, { align: 'center' })
  pdf.setFontSize(34)
  pdf.text('60', 76, 170, { align: 'center' })
  pdf.setFontSize(12)
  pdf.text('پ1\nپ2\nپ3\nپ4\nپ5\nپ6\nكۆ', 180, 133, { align: 'center', maxWidth: 20 })

  pdf.rect(14, 215, 182, 47)
  pdf.setFontSize(10)
  pdf.text(textValue(findField(fields, 'Cover Instructions')), 18, 222, { maxWidth: 172 })

  pdf.rect(14, 266, 182, 14)
  pdf.setFontSize(13)
  pdf.text(textValue(findField(fields, 'Footer Blessing')), 105, 274, { align: 'center' })
  pdf.setFontSize(10)
  pdf.text(textValue(findField(fields, 'Lecturer Signature')), 190, 272, {
    align: 'right',
    maxWidth: 70,
  })
}

export const resolvePdfImageFit = ({
  sourceWidth,
  sourceHeight,
  size,
  availableHeight,
}: {
  sourceWidth: number
  sourceHeight: number
  size: SupportedImageSize
  availableHeight: number
}) => {
  const maxWidth = Math.min(imageWidthBySize[size], contentWidth - 10)

  return fitWithinBox(
    {
      width: sourceWidth,
      height: sourceHeight,
    },
    {
      width: maxWidth,
      height: Math.max(40, availableHeight),
    },
  )
}

const drawQuestion = async (
  context: PdfWriteContext,
  block: QuestionBlock,
  index: number,
  assets: ExamProject['assets'],
  mode: ExportMode,
) => {
  ensureSpace(context, 18)

  context.pdf.setFont('times', 'bold')
  const title = `${index}. ${block.prompt}${block.marks ? ` (${block.marks} marks)` : ''}`
  drawWrapped({ context, text: title, lineHeight: 6 })

  context.pdf.setFont('times', 'normal')
  context.y += 2

  if (block.type === 'mcq') {
    block.options.forEach((option, optionIndex) => {
      drawWrapped({
        context,
        text: `${String.fromCharCode(65 + optionIndex)}. ${option || 'Option'}`,
        x: margin + 5,
        lineHeight: 6,
      })
    })
  }

  if (block.type === 'true_false') {
    drawWrapped({
      context,
      text:
        mode === 'student'
          ? 'Answer: ________'
          : getBlockAnswerText(block) ?? 'Answer: ________',
      x: margin + 5,
      lineHeight: 6,
    })
  }

  if (block.type === 'fill_blank') {
    drawWrapped({
      context,
      text:
        mode === 'student'
          ? 'Answer space: __________________________________________'
          : getBlockAnswerText(block) ?? 'Answer space: __________________________________________',
      x: margin + 5,
      lineHeight: 6,
    })
  }

  if (block.type === 'essay') {
    const lines = block.answerLines ?? 4
    for (let i = 0; i < lines; i += 1) {
      ensureSpace(context, 8)
      context.pdf.line(margin + 5, context.y + 2, pageWidth - margin, context.y + 2)
      context.y += 7
    }
  }

  if (block.type === 'image_question') {
    const asset = assets[block.assetId]
    if (asset?.path) {
      const imageSource = await resolveImageDataUrl(asset.path).catch(() => asset.path)

      const sourceDimensions =
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : await getImageDimensionsFromDataUrl(imageSource).catch(
              () => ({ width: 1600, height: 900 }),
            )

      let availableHeight = contentBottom - context.y - 12
      if (availableHeight < 40) {
        startNewPage(context)
        availableHeight = contentBottom - context.y - 12
      }

      const fitted = resolvePdfImageFit({
        sourceWidth: sourceDimensions.width,
        sourceHeight: sourceDimensions.height,
        size: block.size ?? 'medium',
        availableHeight,
      })

      const x = margin + (contentWidth - fitted.width) / 2
      const format = getImageTypeFromDataUrl(imageSource) === 'jpg' ? 'JPEG' : 'PNG'
      ensureSpace(context, fitted.height + 6)
      context.pdf.addImage(imageSource, format, x, context.y, fitted.width, fitted.height)
      context.y += fitted.height + 6
    }

    if (block.caption) {
      drawWrapped({
        context,
        text: block.caption,
        x: margin + 5,
        lineHeight: 6,
      })
    }
  }

  if (mode !== 'student') {
    const answerText = getBlockAnswerText(block)
    if (answerText && block.type === 'mcq') {
      drawWrapped({
        context,
        text: answerText,
        x: margin + 5,
        lineHeight: 6,
      })
    }

    const notes = getBlockInstructorNotes(block)
    if (notes) {
      drawWrapped({
        context,
        text: `Instructor notes: ${notes}`,
        x: margin + 5,
        lineHeight: 6,
      })
    }
  }

  context.y += 4
}

export const buildExamPdf = async (
  project: ExamProject,
  mode: ExportMode = 'student',
) => {
  const pdf = await buildExamPdfDocument(project, mode)
  return pdf.output('blob')
}

export const buildExamPdfDocument = async (
  project: ExamProject,
  mode: ExportMode = 'student',
) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const context = createContext(pdf)
  const isShaqlawaCover = project.settings?.templatePresetId === 'shaqlawa_linux_gui'

  const coverImageField = project.templateFields
    ? project.templateFields.find(
        (field) =>
          field.section === 'header' &&
          field.label === 'Cover Page Image' &&
          isImageTemplateValue(field.value),
      )
    : undefined
  const headerFields = project.templateFields
    ? project.templateFields.filter(
        (field) => field.section === 'header' && field.label !== 'Cover Page Image',
      )
    : []
  const footerFields = project.templateFields ? project.templateFields.filter(f => f.section === 'footer') : []

  pdf.setFont('times', 'bold')
  pdf.setFontSize(15)

  if (mode === 'instructor') {
    drawWrapped({ context, text: 'INSTRUCTOR COPY', lineHeight: 7 })
  }

  if (mode === 'answer_key') {
    drawWrapped({ context, text: 'ANSWER KEY', lineHeight: 7 })
  }

  if (isShaqlawaCover) {
    await drawShaqlawaCoverPage(pdf, project.templateFields)
    startNewPage(context)
  } else if (coverImageField?.value) {
    await drawTemplateImage(
      context,
      coverImageField.value,
      contentWidth,
      contentBottom - margin,
    )
    startNewPage(context)
  }

  if (headerFields.length > 0) {
      for (const field of headerFields) {
      if (isImageTemplateValue(field.value)) {
        await drawTemplateImage(context, field.value, 80, 30)
        if (field.label) {
          drawWrapped({ context, text: field.label, lineHeight: 6 })
        }
        continue
      }

        drawWrapped({ context, text: `${field.label}: ${field.value}`, lineHeight: 7 })
      }
  } else {
    // fallback for tests
      drawWrapped({ context, text: 'Metadata missing', lineHeight: 7 })
  }

  context.y += 2
  drawRule(context)

  pdf.setFontSize(12)

  let questionIndex = 1
  const numberingMode = project.settings?.numberingMode ?? 'global'
  for (const section of project.sections) {
    if (numberingMode === 'per_section') {
      questionIndex = 1
    }

    if (section.title) {
      pdf.setFont('times', 'bold')
      drawWrapped({ context, text: section.title, lineHeight: 6 })
      pdf.setFont('times', 'normal')
    }

    if (section.instructions) {
      drawWrapped({ context, text: section.instructions, lineHeight: 6 })
    }

    for (const block of section.items) {
      if (!shouldRenderBlockForMode(block, mode)) {
        continue
      }

      await drawQuestion(context, block, questionIndex, project.assets, mode)
      questionIndex += 1
    }
  }

  if (questionIndex === 1) {
    drawWrapped({
      context,
      text: 'No questions have been added to this paper yet.',
      lineHeight: 6,
    })
  }

  drawRule(context)
  
  if (footerFields.length > 0) {
    pdf.setFontSize(10)
    for (const field of footerFields) {
      if (isImageTemplateValue(field.value)) {
        await drawTemplateImage(context, field.value, 55, 20)
        if (field.label) {
          drawWrapped({ context, text: field.label, lineHeight: 5 })
        }
        continue
      }

        drawWrapped({ context, text: `${field.label}: ${field.value}`, lineHeight: 6 })
    }
  }
  
  const pages = pdf.getNumberOfPages()
  pdf.setFont('times', 'normal')
  pdf.setFontSize(9)

  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.text(`Page ${page}`, pageWidth - margin, pageHeight - 8, { align: 'right' })
  }

  return pdf
}

export const exportExamPdf = async (
  project: ExamProject,
  fileName: string,
  mode: ExportMode = 'student',
) => {
  const blob = await buildExamPdf(project, mode)
  downloadBlob(blob, fileName)
}
