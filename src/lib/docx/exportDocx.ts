import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from 'docx'

import { downloadBlob } from '@/lib/file-system/projectFile'
import {
  fitWithinBox,
  getImageDimensionsFromDataUrl,
  getImageTypeFromDataUrl,
} from '@/lib/utils/exportLayout'
import type {
  ExamProject,
  TemplateField,
  ImageQuestionBlock,
  QuestionBlock,
} from '@/types/exam'

const blockLabel: Record<QuestionBlock['type'], string> = {
  essay: 'Essay',
  mcq: 'Multiple Choice',
  true_false: 'True / False',
  fill_blank: 'Fill in the Blank',
  image_question: 'Image Question',
}

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(',')[1]
  if (!base64) {
    return null
  }

  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }

  return bytes
}

const isImageTemplateValue = (value: string) => value.trim().startsWith('data:image/')

const resolveAlignment = (
  alignment: TemplateField['style'] | undefined,
  fallback: (typeof AlignmentType)[keyof typeof AlignmentType],
) => {
  if (alignment?.alignment === 'center') {
    return AlignmentType.CENTER
  }

  if (alignment?.alignment === 'right') {
    return AlignmentType.RIGHT
  }

  if (alignment?.alignment === 'justify') {
    return AlignmentType.JUSTIFIED
  }

  if (alignment?.alignment === 'left') {
    return AlignmentType.LEFT
  }

  return fallback
}



const imageDimensionMap: Record<NonNullable<ImageQuestionBlock['size']>, number> = {
  small: 220,
  medium: 340,
  large: 460,
}

const imageHeightMap: Record<NonNullable<ImageQuestionBlock['size']>, number> = {
  small: 180,
  medium: 260,
  large: 320,
}

const templateFieldParagraph = async (
  field: TemplateField,
  options: {
    align: (typeof AlignmentType)[keyof typeof AlignmentType]
    bold?: boolean
    italics?: boolean
    maxWidth: number
    maxHeight: number
    spacingAfter?: number
    spacingBefore?: number
  },
) => {
  if (!isImageTemplateValue(field.value)) {
    const displayMode = field.displayMode ?? 'label_value'
    const textValue =
      displayMode === 'value_only' ? field.value : `${field.label}: ${field.value}`
    if (!textValue.trim()) {
      return null
    }

    return new Paragraph({
      alignment: resolveAlignment(field.style, options.align),
      children: [
        new TextRun({
          text: textValue,
          bold: field.style?.bold ?? options.bold,
          italics: field.style?.italics ?? options.italics,
          underline: field.style?.underline ? {} : undefined,
          size: field.style?.fontSizePt ? field.style.fontSizePt * 2 : undefined,
          font: field.style?.fontFamily,
          color: field.style?.colorHex,
        }),
      ],
      spacing: { after: options.spacingAfter, before: options.spacingBefore },
    })
  }

  const bytes = dataUrlToBytes(field.value)
  if (!bytes) {
    return null
  }

  const sourceDimensions = await getImageDimensionsFromDataUrl(field.value).catch(
    () => ({ width: 1200, height: 800 }),
  )
  const fitted = fitWithinBox(sourceDimensions, {
    width: options.maxWidth,
    height: options.maxHeight,
  })

  return new Paragraph({
    alignment: resolveAlignment(field.style, options.align),
    children: [
      new ImageRun({
        data: bytes,
        type: getImageTypeFromDataUrl(field.value),
        transformation: {
          width: fitted.width,
          height: fitted.height,
        },
      }),
    ],
    spacing: { after: options.spacingAfter, before: options.spacingBefore },
  })
}

const questionParagraphs = async (
  index: number,
  block: QuestionBlock,
  assets: ExamProject['assets'],
) => {
  const header = new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [
      new TextRun({ text: `${index}. ${block.prompt}`, bold: true }),
      new TextRun({ text: block.marks ? `  (${block.marks} marks)` : '' }),
    ],
  })

  const children: Paragraph[] = [header]

  if (block.type === 'mcq') {
    block.options.forEach((option, optionIndex) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun(
              `${String.fromCharCode(65 + optionIndex)}. ${option || 'Option'}`,
            ),
          ],
          spacing: { after: 50 },
        }),
      )
    })
  }

  if (block.type === 'true_false') {
    children.push(
      new Paragraph({
        children: [
          new TextRun(
            `Answer: ${
              block.answer === undefined ? '________' : block.answer ? 'True' : 'False'
            }`,
          ),
        ],
      }),
    )
  }

  if (block.type === 'fill_blank') {
    children.push(
      new Paragraph({
        children: [new TextRun('Answer space: _____________________________')],
      }),
    )
  }

  if (block.type === 'essay') {
    const lines = block.answerLines ?? 4
    for (let i = 0; i < lines; i += 1) {
      children.push(
        new Paragraph({
          children: [new TextRun('____________________________________________________')],
          spacing: { after: 60 },
        }),
      )
    }
  }

  if (block.type === 'image_question') {
    const asset = assets[block.assetId]

    if (asset?.path) {
      const bytes = dataUrlToBytes(asset.path)
      if (bytes) {
        const size = block.size ?? 'medium'
        const sourceDimensions =
          asset.width && asset.height
            ? { width: asset.width, height: asset.height }
            : await getImageDimensionsFromDataUrl(asset.path).catch(
                () => ({ width: 1600, height: 900 }),
              )
        const fitted = fitWithinBox(sourceDimensions, {
          width: imageDimensionMap[size],
          height: imageHeightMap[size],
        })

        const alignment =
          block.layout === 'left'
            ? AlignmentType.LEFT
            : block.layout === 'right'
              ? AlignmentType.RIGHT
              : AlignmentType.CENTER

        children.push(
          new Paragraph({
            alignment,
            children: [
              new ImageRun({
                data: bytes,
                type: getImageTypeFromDataUrl(asset.path),
                transformation: {
                  width: fitted.width,
                  height: fitted.height,
                },
              }),
            ],
            spacing: { before: 100, after: 90 },
          }),
        )
      }
    }

    if (block.caption) {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: block.caption, italics: true })],
        }),
      )
    }
  }

  children.push(
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: blockLabel[block.type], color: '6B7280' })],
    }),
  )

  return children
}

export const buildExamDocx = async (project: ExamProject) => {
  const headerFields = project.templateFields ? project.templateFields.filter(f => f.section === 'header') : []
  const footerFields = project.templateFields ? project.templateFields.filter(f => f.section === 'footer') : []

  const headerParagraphs = (
    await Promise.all(
      headerFields.map((field) =>
        templateFieldParagraph(field, {
          align: AlignmentType.CENTER,
          bold: true,
          maxWidth: 420,
          maxHeight: 160,
          spacingAfter: 60,
        }),
      ),
    )
  ).filter((paragraph): paragraph is Paragraph => Boolean(paragraph))

  const introParagraphs = headerParagraphs.length > 0 ? headerParagraphs : [
      new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Metadata missing', bold: true })],
          spacing: { after: 60 },
      }),
  ]

  const questionBlocks = project.sections.flatMap((section) => section.items)
  const questionParagraphCollection = await Promise.all(
    questionBlocks.map((block, index) =>
      questionParagraphs(index + 1, block, project.assets),
    ),
  )

  const questionParagraphsFlat = questionParagraphCollection.flat()
  const bodyParagraphs =
    questionParagraphsFlat.length > 0
      ? questionParagraphsFlat
      : [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun('No questions have been added to this paper yet.')],
          }),
        ]

  const footerParagraphs = (
    await Promise.all(
      footerFields.map((field) =>
        templateFieldParagraph(field, {
          align: AlignmentType.LEFT,
          italics: true,
          maxWidth: 260,
          maxHeight: 100,
          spacingBefore: 80,
        }),
      ),
    )
  ).filter((paragraph): paragraph is Paragraph => Boolean(paragraph))

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1080,
              bottom: 1440,
              left: 1080,
            },
          },
        },
        children: [
          ...introParagraphs,
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            children: [new TextRun('Examination Paper')],
            spacing: { before: 160, after: 120 },
          }),
          ...bodyParagraphs,
          new Paragraph({
            spacing: { before: 220 },
            children: [
              new TextRun('End of Paper'),
            ],
          }),
          ...footerParagraphs,
        ],
      },
    ],
  })

  return Packer.toBlob(doc)
}

export const exportExamDocx = async (project: ExamProject, fileName: string) => {
  const blob = await buildExamDocx(project)
  downloadBlob(blob, fileName)
}
