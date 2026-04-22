import { newId } from '@/lib/utils/id'
import type {
  BlockType,
  EssayBlock,
  FillBlankBlock,
  ImageQuestionBlock,
  MCQBlock,
  QuestionBlock,
  TrueFalseBlock,
} from '@/types/exam'

export const createBlock = (type: BlockType): QuestionBlock => {
  const id = newId()

  switch (type) {
    case 'essay': {
      const block: EssayBlock = {
        id,
        type,
        prompt: 'Write your answer.',
        answerLines: 4,
      }
      return block
    }
    case 'mcq': {
      const block: MCQBlock = {
        id,
        type,
        prompt: 'Select the correct answer.',
        options: ['Option A', 'Option B'],
      }
      return block
    }
    case 'true_false': {
      const block: TrueFalseBlock = {
        id,
        type,
        prompt: 'Mark as true or false.',
      }
      return block
    }
    case 'fill_blank': {
      const block: FillBlankBlock = {
        id,
        type,
        prompt: 'Fill in the blank: ______',
        answers: [],
      }
      return block
    }
    case 'image_question': {
      const block: ImageQuestionBlock = {
        id,
        type,
        prompt: 'Analyze the image and answer.',
        assetId: '',
        layout: 'top',
        size: 'medium',
      }
      return block
    }
    default:
      return {
        id,
        type: 'essay',
        prompt: 'Write your answer.',
      }
  }
}
