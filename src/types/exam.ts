export type BlockType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'essay'
  | 'image_question'

export type NumberingMode = 'global' | 'per_section'
export type ExportMode = 'student' | 'instructor' | 'answer_key'

export type TemplatePresetId =
  | 'default_university'
  | 'engineering_midterm'
  | 'medical_final'
  | 'shaqlawa_linux_gui'

export type ExamSettings = {
  templatePresetId?: TemplatePresetId
  targetTotalMarks?: number
  numberingMode?: NumberingMode
}

export type AssetMap = Record<
  string,
  {
    id: string
    kind: 'image'
    path: string
    width?: number
    height?: number
  }
>

export type ExamProject = {
  id: string
  version: number
  projectVersion?: number
  baseProjectId?: string
  sourceProjectId?: string
  versionHistory?: ProjectVersionEntry[]
  settings?: ExamSettings
  templateFields: TemplateField[]
  sections: ExamSection[]
  assets: AssetMap
  createdAt: string
  updatedAt: string
}


export type ExamSection = {
  id: string
  title?: string
  instructions?: string
  items: QuestionBlock[]
}

export type BaseBlock = {
  id: string
  type: BlockType
  marks?: number
  instructorOnly?: boolean
  instructorNotes?: string
}

export type MCQBlock = BaseBlock & {
  type: 'mcq'
  prompt: string
  options: string[]
  correctIndex?: number
}

export type TrueFalseBlock = BaseBlock & {
  type: 'true_false'
  prompt: string
  answer?: boolean
}

export type FillBlankBlock = BaseBlock & {
  type: 'fill_blank'
  prompt: string
  answers?: string[]
}

export type EssayBlock = BaseBlock & {
  type: 'essay'
  prompt: string
  answerLines?: number
}

export type ImageQuestionBlock = BaseBlock & {
  type: 'image_question'
  prompt: string
  caption?: string
  assetId: string
  layout?: 'top' | 'left' | 'right'
  size?: 'small' | 'medium' | 'large'
}

export type QuestionBlock =
  | MCQBlock
  | TrueFalseBlock
  | FillBlankBlock
  | EssayBlock
  | ImageQuestionBlock

export type TemplateFieldDisplayMode = 'label_value' | 'value_only'

export type TemplateFieldStyle = {
  alignment?: 'left' | 'center' | 'right' | 'justify'
  bold?: boolean
  italics?: boolean
  underline?: boolean
  fontSizePt?: number
  fontFamily?: string
  colorHex?: string
  position?: {
    x?: number
    y?: number
    width?: number
    height?: number
    rotationDeg?: number
  }
}

export type TemplateField = {
  id: string
  label: string
  value: string
  section: 'header' | 'footer'
  locked?: boolean
  formatLocked?: boolean
  displayMode?: TemplateFieldDisplayMode
  style?: TemplateFieldStyle
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard'

export type QuestionBankEntry = {
  id: string
  block: QuestionBlock
  tags: string[]
  course?: string
  subject?: string
  chapter?: string
  difficulty?: QuestionDifficulty
  createdAt: string
  updatedAt: string
  sourceProjectId?: string
}

export type SnippetKind = 'instruction' | 'header' | 'footer' | 'note'

export type SnippetEntry = {
  id: string
  kind: SnippetKind
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export type ProjectVersionEntry = {
  id: string
  versionNumber: number
  fileName?: string
  createdAt: string
  sourceProjectId?: string
}

export type ImportConflict = {
  id: string
  kind: 'template_field' | 'section' | 'block' | 'asset'
  targetId: string
  incomingId: string
  message: string
}
