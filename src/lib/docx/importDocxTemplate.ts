import { invoke } from '@tauri-apps/api/core'

import { createBlock } from '@/features/questions/blockFactory'
import { newId } from '@/lib/utils/id'
import type {
  ExamProject,
  ExamSection,
  FillBlankBlock,
  MCQBlock,
  QuestionBlock,
  TemplateField,
  TemplateFieldStyle,
  TrueFalseBlock,
} from '@/types/exam'

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MAX_DOCX_BYTES = 25 * 1024 * 1024

type DocxImportSegment = {
  text: string
  bold: boolean
  italics: boolean
  underline: boolean
  fontSizePt?: number
  fontFamily?: string
  colorHex?: string
}

type DocxImportImage = {
  sourcePath: string
  mime: string
  dataUrl: string
  altText?: string
}

type DocxImportedBlock = {
  source: string
  text: string
  alignment?: string
  segments: DocxImportSegment[]
  images: DocxImportImage[]
}

export type DocxImportPayload = {
  headers: DocxImportedBlock[]
  footers: DocxImportedBlock[]
  body: DocxImportedBlock[]
  warnings: string[]
}

export type DocxImportedProject = {
  project: ExamProject
  warnings: string[]
}

const tokenPattern = /\{\{\s*([^{}]+?)\s*\}\}|\[\s*([^\[\]]+?)\s*\]|<<\s*([^<>]+?)\s*>>/g

const choiceLinePattern = /^\s*([A-F])[\).:-]\s*(.+)$/i
const numberedQuestionPattern = /^\s*(?:q(?:uestion)?\s*)?(\d+)[\).:-]\s*(.+)$/i

const normalizeColor = (value?: string) => {
  if (!value) {
    return undefined
  }

  const normalized = value.replace('#', '').trim().toUpperCase()
  return /^[0-9A-F]{6}$/.test(normalized) ? normalized : undefined
}

const normalizeAlignment = (
  value?: string,
): TemplateFieldStyle['alignment'] | undefined => {
  if (!value) {
    return undefined
  }

  if (value === 'left' || value === 'center' || value === 'right' || value === 'justify') {
    return value
  }

  if (value === 'both') {
    return 'justify'
  }

  return undefined
}

const segmentWeight = (segment: DocxImportSegment) => segment.text.trim().length

const styleFromBlock = (block: DocxImportedBlock): TemplateFieldStyle | undefined => {
  const alignment = normalizeAlignment(block.alignment)
  const dominantSegment = [...block.segments].sort(
    (left, right) => segmentWeight(right) - segmentWeight(left),
  )[0]

  const style: TemplateFieldStyle = {
    alignment,
    bold: dominantSegment?.bold,
    italics: dominantSegment?.italics,
    underline: dominantSegment?.underline,
    fontSizePt: dominantSegment?.fontSizePt,
    fontFamily: dominantSegment?.fontFamily,
    colorHex: normalizeColor(dominantSegment?.colorHex),
  }

  return Object.values(style).some((value) => value !== undefined) ? style : undefined
}

export const isDocxFile = (file: File) =>
  file.name.toLowerCase().endsWith('.docx') || file.type === DOCX_MIME

const titleCase = (value: string) =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')

const cleanTokenName = (token: string) =>
  token
    .trim()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')

const detectTokens = (value: string) => {
  const found = new Set<string>()
  for (const match of value.matchAll(tokenPattern)) {
    const token = cleanTokenName(match[1] ?? match[2] ?? match[3] ?? '')
    if (token) {
      found.add(token)
    }
  }
  return Array.from(found)
}

const splitLabelValue = (value: string) => {
  const separatorIndex = value.indexOf(':')
  if (separatorIndex < 1) {
    return null
  }

  return {
    label: value.slice(0, separatorIndex).trim(),
    rawValue: value.slice(separatorIndex + 1).trim(),
  }
}

const cleanedValueWithoutTokens = (value: string) =>
  value.replace(tokenPattern, '').replace(/\s+/g, ' ').trim()

const createTemplateField = (
  section: 'header' | 'footer',
  label: string,
  value: string,
  options?: {
    displayMode?: TemplateField['displayMode']
    style?: TemplateFieldStyle
  },
): TemplateField => ({
  id: newId(),
  label: label || (section === 'header' ? 'Imported Header' : 'Imported Footer'),
  value,
  section,
  displayMode: options?.displayMode,
  style: options?.style,
})

const mapTextBlockToFields = (
  block: DocxImportedBlock,
  section: 'header' | 'footer',
  index: number,
): TemplateField[] => {
  const fields: TemplateField[] = []
  const text = block.text.trim()
  const style = styleFromBlock(block)

  if (!text) {
    return fields
  }

  const labelValue = splitLabelValue(text)
  if (labelValue) {
    const tokens = detectTokens(labelValue.rawValue)
    const cleaned = cleanedValueWithoutTokens(labelValue.rawValue)

    if (tokens.length === 1 && !cleaned) {
      fields.push(
        createTemplateField(section, labelValue.label, '', {
          displayMode: 'label_value',
          style,
        }),
      )
      return fields
    }

    fields.push(
      createTemplateField(
        section,
        labelValue.label,
        cleaned || labelValue.rawValue,
        {
          displayMode: 'label_value',
          style,
        },
      ),
    )
    return fields
  }

  const tokens = detectTokens(text)
  if (tokens.length > 0) {
    for (const token of tokens) {
      fields.push(
        createTemplateField(section, titleCase(token), '', {
          displayMode: 'label_value',
          style,
        }),
      )
    }
    return fields
  }

  const fallbackLabel =
    section === 'header'
      ? `Imported Header ${index + 1}`
      : `Imported Footer ${index + 1}`

  fields.push(
    createTemplateField(section, fallbackLabel, text, {
      displayMode: 'value_only',
      style,
    }),
  )
  return fields
}

const mapBlocksToTemplateFields = (
  blocks: DocxImportedBlock[],
  section: 'header' | 'footer',
): TemplateField[] => {
  const fields: TemplateField[] = []

  blocks.forEach((block, blockIndex) => {
    fields.push(...mapTextBlockToFields(block, section, blockIndex))

    block.images.forEach((image, imageIndex) => {
      fields.push(
        createTemplateField(
          section,
          image.altText?.trim() ||
            `${section === 'header' ? 'Header' : 'Footer'} Image ${
              blockIndex + 1
            }-${imageIndex + 1}`,
          image.dataUrl,
          {
            displayMode: 'value_only',
            style: {
              alignment: normalizeAlignment(block.alignment),
            },
          },
        ),
      )
    })
  })

  const deduped = new Map<string, TemplateField>()
  for (const field of fields) {
    const styleKey = JSON.stringify(field.style ?? {})
    const key = `${field.section}::${field.label.toLowerCase()}::${field.value}::${field.displayMode ?? 'label_value'}::${styleKey}`
    if (!deduped.has(key)) {
      deduped.set(key, field)
    }
  }

  return Array.from(deduped.values())
}

const questionPromptFromLine = (line: string) => {
  const numbered = line.match(numberedQuestionPattern)
  if (numbered?.[2]) {
    return numbered[2].trim()
  }

  if (line.endsWith('?') && line.length > 6) {
    return line.trim()
  }

  return null
}

const normalizeQuestionPrompt = (value: string) =>
  value.replace(/\s+/g, ' ').replace(/^[\-•\s]+/, '').trim()

const isTrueFalsePrompt = (value: string) =>
  /\btrue\s*\/\s*false\b|\btrue\s+or\s+false\b/i.test(value)

const isFillBlankPrompt = (value: string) =>
  /_{3,}|\bfill\s+in\s+the\s+blank\b/i.test(value)

const isInstructionLine = (value: string) =>
  /^(read|answer|note|instructions?|time|duration|choose|attempt|all questions?)\b/i.test(
    value.trim(),
  )

const parseChoiceLine = (line: string) => {
  const match = line.match(choiceLinePattern)
  return match?.[2]?.trim() ?? null
}

type PendingQuestion = {
  prompt: string
  tailLines: string[]
  choices: string[]
}

const buildBlockFromPending = (pending: PendingQuestion): QuestionBlock => {
  const detailText = pending.tailLines.join(' ').trim()
  const prompt = normalizeQuestionPrompt(
    `${pending.prompt}${detailText ? ` ${detailText}` : ''}`,
  )

  if (pending.choices.length >= 2) {
    const block = createBlock('mcq') as MCQBlock
    block.prompt = prompt
    block.options = pending.choices.slice(0, 6)
    return block
  }

  if (isTrueFalsePrompt(prompt)) {
    const block = createBlock('true_false') as TrueFalseBlock
    block.prompt = prompt
    return block
  }

  if (isFillBlankPrompt(prompt)) {
    const block = createBlock('fill_blank') as FillBlankBlock
    block.prompt = prompt
    return block
  }

  const block = createBlock('essay')
  block.prompt = prompt
  return block
}

const mapBodyToSections = (blocks: DocxImportedBlock[]): ExamSection[] => {
  const lines = blocks
    .map((block) => block.text.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\s+/g, ' ').trim())

  if (lines.length === 0) {
    return [
      {
        id: newId(),
        title: 'Section A',
        instructions: 'Imported template had no readable center content.',
        items: [createBlock('essay')],
      },
    ]
  }

  const mappedBlocks: QuestionBlock[] = []
  const referenceLines: string[] = []
  let pending: PendingQuestion | null = null

  const flushPending = () => {
    if (!pending) {
      return
    }

    mappedBlocks.push(buildBlockFromPending(pending))
    pending = null
  }

  for (const line of lines) {
    const prompt = questionPromptFromLine(line)
    if (prompt) {
      flushPending()
      pending = {
        prompt,
        tailLines: [],
        choices: [],
      }
      continue
    }

    if (!pending) {
      referenceLines.push(line)
      continue
    }

    const choice = parseChoiceLine(line)
    if (choice) {
      pending.choices.push(choice)
      continue
    }

    if (isInstructionLine(line)) {
      flushPending()
      referenceLines.push(line)
      continue
    }

    pending.tailLines.push(line)
  }

  flushPending()

  const items = mappedBlocks

  const instructions = referenceLines.slice(0, 8).join('\n')

  return [
    {
      id: newId(),
      title: items.length > 0 ? 'Imported Questions' : 'Imported Body Reference',
      instructions:
        instructions ||
        (items.length > 0
          ? 'Center content imported. Review and edit questions as needed.'
          : 'Center content imported as reference text. Add or convert questions manually.'),
      items,
    },
  ]
}

const hasTauriBridge = () => {
  const win = window as Window & {
    __TAURI_INTERNALS__?: unknown
    __TAURI__?: unknown
  }

  return Boolean(win.__TAURI_INTERNALS__ || win.__TAURI__)
}

const fileToBase64 = async (file: File) => {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const chunkSize = 0x8000
  let binary = ''

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

export const mapDocxImportToProject = (
  imported: DocxImportPayload,
  sourceName: string,
): DocxImportedProject => {
  const now = new Date().toISOString()

  const templateFields = [
    ...mapBlocksToTemplateFields(imported.headers, 'header'),
    ...mapBlocksToTemplateFields(imported.footers, 'footer'),
  ]

  const warnings = [...imported.warnings]
  if (templateFields.length === 0) {
    warnings.push('No editable header/footer fields were extracted.')
  }

  const project: ExamProject = {
    id: newId(),
    version: 1,
    templateFields,
    sections: mapBodyToSections(imported.body),
    assets: {},
    createdAt: now,
    updatedAt: now,
  }

  if (sourceName.toLowerCase().endsWith('.docx') && project.sections[0]?.items.length === 0) {
    warnings.push('Center content imported as reference text. Convert to question blocks as needed.')
  }

  return { project, warnings }
}

export const importDocxTemplateProject = async (
  file: File,
): Promise<DocxImportedProject> => {
  if (!isDocxFile(file)) {
    throw new Error('Please choose a DOCX file (.docx).')
  }

  if (file.size > MAX_DOCX_BYTES) {
    throw new Error('DOCX file is too large. Maximum size is 25 MB.')
  }

  if (!hasTauriBridge()) {
    throw new Error('DOCX import is available only in the desktop app build.')
  }

  const docxBase64 = await fileToBase64(file)

  const imported = await invoke<DocxImportPayload>('import_docx_template', {
    docxBase64,
  })

  return mapDocxImportToProject(imported, file.name)
}
