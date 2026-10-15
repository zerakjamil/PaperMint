export type BlockType =
  | 'mcq'
  | 'multi_select_mcq'
  | 'true_false'
  | 'fill_blank'
  | 'essay'
  | 'short_answer'
  | 'image_question'
  | 'matching'
  | 'ordering'
  | 'numeric'

export type NumberingMode = 'global' | 'per_section'
export type ExportMode = 'student' | 'instructor' | 'answer_key'

export type TemplatePresetId =
  | 'default_university'
  | 'engineering_midterm'
  | 'medical_final'
  | 'shaqlawa_linux_gui'
  | 'shaqlawa_blank'

export type PageLayout = {
  headerHeightMm?: number
  footerHeightMm?: number
  pageWidthMm?: number
  pageHeightMm?: number
  marginTopMm?: number
  marginBottomMm?: number
  marginLeftMm?: number
  marginRightMm?: number
  differentFirstPage?: boolean
  differentOddEven?: boolean
}

export type ExamSettings = {
  templatePresetId?: TemplatePresetId
  targetTotalMarks?: number
  numberingMode?: NumberingMode
  pageLayout?: PageLayout
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
  rubric?: GradingRubric
}

export type GradingRubric = {
  criteria: GradingCriterion[]
}

export type GradingCriterion = {
  id: string
  label: string
  maxPoints: number
  description?: string
}

export type MCQBlock = BaseBlock & {
  type: 'mcq'
  prompt: string
  options: string[]
  correctIndex?: number
}

export type MultiSelectMCQBlock = BaseBlock & {
  type: 'multi_select_mcq'
  prompt: string
  options: string[]
  correctIndices?: number[]
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

export type ShortAnswerBlock = BaseBlock & {
  type: 'short_answer'
  prompt: string
  answerLines?: number
  maxWords?: number
  suggestedAnswer?: string
}

export type ImageQuestionBlock = BaseBlock & {
  type: 'image_question'
  prompt: string
  caption?: string
  assetId: string
  layout?: 'top' | 'left' | 'right'
  size?: 'small' | 'medium' | 'large'
}

export type MatchingBlock = BaseBlock & {
  type: 'matching'
  prompt: string
  leftItems: string[]
  rightItems: string[]
  correctPairs?: [number, number][]
}

export type OrderingBlock = BaseBlock & {
  type: 'ordering'
  prompt: string
  items: string[]
  correctOrder?: number[]
}

export type NumericBlock = BaseBlock & {
  type: 'numeric'
  prompt: string
  correctAnswer?: number
  tolerance?: number
  unit?: string
}

export type QuestionBlock =
  | MCQBlock
  | MultiSelectMCQBlock
  | TrueFalseBlock
  | FillBlankBlock
  | EssayBlock
  | ShortAnswerBlock
  | ImageQuestionBlock
  | MatchingBlock
  | OrderingBlock
  | NumericBlock

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
  paragraphSpacing?: {
    beforePt?: number
    afterPt?: number
    lineSpacing?: number
    lineSpacingRule?: 'auto' | 'exact' | 'atLeast'
  }
  border?: {
    top?: boolean
    bottom?: boolean
    left?: boolean
    right?: boolean
    colorHex?: string
    style?: 'single' | 'double' | 'dashed' | 'dotted'
    widthPt?: number
  }
  backgroundColor?: string
  tabStops?: { positionMm: number; alignment?: 'left' | 'center' | 'right' }[]
}

export type TemplateField = {
  id: string
  key?: string
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

export type ExamVersion = {
  id: string
  label: string
  randomizeQuestions?: boolean
  randomizeOptions?: boolean
  sections: ExamSection[]
  answerKey?: ExamSection[]
}

export type StudentRoster = {
  id: string
  name: string
  students: StudentEntry[]
}

export type StudentEntry = {
  id: string
  serialNumber?: string
  fullName: string
  group?: string
}

export type BubbleSheetConfig = {
  id: string
  questions: number
  optionsPerQuestion: number
  includeStudentId?: boolean
  includeVersionLabel?: boolean
}

export type TemplateFieldTable = {
  rows: number
  columns: number
  cells: TemplateField[][]
  style?: TemplateFieldStyle
}
