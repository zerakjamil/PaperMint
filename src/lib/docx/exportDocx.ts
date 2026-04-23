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
  isImageSourceValue,
  resolveImageDataUrl,
} from '@/lib/utils/exportLayout'
import {
  getBlockAnswerText,
  getBlockInstructorNotes,
  shouldRenderBlockForMode,
} from '@/lib/export/exportMode'
import type {
  ExamProject,
  ExportMode,
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

const isImageTemplateValue = (value: string) => isImageSourceValue(value)

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

  const imageDataUrl = await resolveImageDataUrl(field.value)
  const bytes = dataUrlToBytes(imageDataUrl)
  if (!bytes) {
    return null
  }

  const sourceDimensions = await getImageDimensionsFromDataUrl(imageDataUrl).catch(
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
        type: getImageTypeFromDataUrl(imageDataUrl),
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
  mode: ExportMode,
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
            mode === 'student'
              ? 'Answer: ________'
              : getBlockAnswerText(block) ?? 'Answer: ________',
          ),
        ],
      }),
    )
  }

  if (block.type === 'fill_blank') {
    children.push(
      new Paragraph({
        children: [
          new TextRun(
            mode === 'student'
              ? 'Answer space: _____________________________'
              : getBlockAnswerText(block) ??
                  'Answer space: _____________________________',
          ),
        ],
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
      const imageSource = await resolveImageDataUrl(asset.path).catch(() => asset.path)
      const bytes = dataUrlToBytes(imageSource)
      if (bytes) {
        const size = block.size ?? 'medium'
        const sourceDimensions =
          asset.width && asset.height
            ? { width: asset.width, height: asset.height }
            : await getImageDimensionsFromDataUrl(imageSource).catch(
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
                type: getImageTypeFromDataUrl(imageSource),
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

  if (mode !== 'student') {
    const answerText = getBlockAnswerText(block)
    if (answerText && block.type === 'mcq') {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: answerText, bold: true })],
          spacing: { before: 60, after: 60 },
        }),
      )
    }

    const notes = getBlockInstructorNotes(block)
    if (notes) {
      children.push(
        new Paragraph({
          children: [new TextRun(`Instructor notes: ${notes}`)],
          spacing: { after: 60 },
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

export const buildExamDocx = async (
  project: ExamProject,
  mode: ExportMode = 'student',
) => {
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

  const coverParagraph = coverImageField
    ? await templateFieldParagraph(coverImageField, {
        align: AlignmentType.CENTER,
        maxWidth: 520,
        maxHeight: 700,
        spacingAfter: 180,
      })
    : null

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

  const introParagraphs = [
    ...(coverParagraph ? [coverParagraph] : []),
    ...(headerParagraphs.length > 0 ? headerParagraphs : [
      new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: 'Metadata missing', bold: true })],
          spacing: { after: 60 },
      }),
    ]),
  ]

  const questionParagraphCollection: Paragraph[][] = []
  const numberingMode = project.settings?.numberingMode ?? 'global'
  let questionIndex = 1

  for (const section of project.sections) {
    if (numberingMode === 'per_section') {
      questionIndex = 1
    }

    for (const block of section.items) {
      if (!shouldRenderBlockForMode(block, mode)) {
        continue
      }

      // eslint-disable-next-line no-await-in-loop
      questionParagraphCollection.push(
        await questionParagraphs(questionIndex, block, project.assets, mode),
      )
      questionIndex += 1
    }
  }

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
          ...(mode === 'instructor'
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'INSTRUCTOR COPY', bold: true })],
                  spacing: { after: 60 },
                }),
              ]
            : []),
          ...(mode === 'answer_key'
            ? [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: 'ANSWER KEY', bold: true })],
                  spacing: { after: 60 },
                }),
              ]
            : []),
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

export const exportExamDocx = async (
  project: ExamProject,
  fileName: string,
  mode: ExportMode = 'student',
) => {
  const blob = await buildExamDocx(project, mode)
  downloadBlob(blob, fileName)
}
