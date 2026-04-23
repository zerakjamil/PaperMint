import type { ExportMode, QuestionBlock } from '@/types/exam'

const normalizeText = (value: string | undefined) => {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : null
}

export const shouldRenderBlockForMode = (
  block: QuestionBlock,
  mode: ExportMode,
) => {
  if (mode !== 'student') {
    return true
  }

  return !block.instructorOnly
}

export const getBlockAnswerText = (block: QuestionBlock) => {
  if (block.type === 'mcq') {
    if (
      block.correctIndex === undefined ||
      block.correctIndex < 0 ||
      block.correctIndex >= block.options.length
    ) {
      return null
    }

    const label = String.fromCharCode(65 + block.correctIndex)
    const optionText = block.options[block.correctIndex] || 'Option'
    return `Correct option: ${label}. ${optionText}`
  }

  if (block.type === 'true_false') {
    if (block.answer === undefined) {
      return null
    }

    return `Correct answer: ${block.answer ? 'True' : 'False'}`
  }

  if (block.type === 'fill_blank') {
    if (!block.answers || block.answers.length === 0) {
      return null
    }

    return `Expected answer(s): ${block.answers.join('; ')}`
  }

  return null
}

export const getBlockInstructorNotes = (block: QuestionBlock) =>
  normalizeText(block.instructorNotes)
