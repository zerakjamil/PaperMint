export type BlockType =
  | 'mcq'
  | 'true_false'
  | 'fill_blank'
  | 'essay'
  | 'image_question'

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
}

export type TemplateField = {
  id: string
  label: string
  value: string
  section: 'header' | 'footer'
  displayMode?: TemplateFieldDisplayMode
  style?: TemplateFieldStyle
}
