import { jsPDF } from 'jspdf'

import { downloadBlob } from '@/lib/file-system/projectFile'
import {
  fitWithinBox,
  getImageDimensionsFromDataUrl,
  getImageTypeFromDataUrl,
} from '@/lib/utils/exportLayout'
import type { ExamProject, QuestionBlock } from '@/types/exam'

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

const isImageTemplateValue = (value: string) => value.trim().startsWith('data:image/')

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
  dataUrl: string,
  maxWidth: number,
  maxHeight: number,
) => {
  const sourceDimensions = await getImageDimensionsFromDataUrl(dataUrl).catch(
    () => ({ width: 1400, height: 800 }),
  )

  const fitted = fitWithinBox(sourceDimensions, {
    width: maxWidth,
    height: maxHeight,
  })

  ensureSpace(context, fitted.height + 6)
  const x = margin + (contentWidth - fitted.width) / 2
  const format = getImageTypeFromDataUrl(dataUrl) === 'jpg' ? 'JPEG' : 'PNG'
  context.pdf.addImage(dataUrl, format, x, context.y, fitted.width, fitted.height)
  context.y += fitted.height + 6
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
      text: `Answer: ${block.answer === undefined ? '________' : block.answer ? 'True' : 'False'}`,
      x: margin + 5,
      lineHeight: 6,
    })
  }

  if (block.type === 'fill_blank') {
    drawWrapped({
      context,
      text: 'Answer space: __________________________________________',
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
      const sourceDimensions =
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : await getImageDimensionsFromDataUrl(asset.path).catch(
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
      const format = getImageTypeFromDataUrl(asset.path) === 'jpg' ? 'JPEG' : 'PNG'
      ensureSpace(context, fitted.height + 6)
      context.pdf.addImage(asset.path, format, x, context.y, fitted.width, fitted.height)
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

  context.y += 4
}

export const buildExamPdf = async (project: ExamProject) => {
  const pdf = await buildExamPdfDocument(project)
  return pdf.output('blob')
}

export const buildExamPdfDocument = async (project: ExamProject) => {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const context = createContext(pdf)

  const headerFields = project.templateFields ? project.templateFields.filter(f => f.section === 'header') : []
  const footerFields = project.templateFields ? project.templateFields.filter(f => f.section === 'footer') : []

  pdf.setFont('times', 'bold')
  pdf.setFontSize(15)

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
  for (const section of project.sections) {
    if (section.title) {
      pdf.setFont('times', 'bold')
      drawWrapped({ context, text: section.title, lineHeight: 6 })
      pdf.setFont('times', 'normal')
    }

    if (section.instructions) {
      drawWrapped({ context, text: section.instructions, lineHeight: 6 })
    }

    for (const block of section.items) {
      await drawQuestion(context, block, questionIndex, project.assets)
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

export const exportExamPdf = async (project: ExamProject, fileName: string) => {
  const blob = await buildExamPdf(project)
  downloadBlob(blob, fileName)
}
