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

  if (block.type === 'multi_select_mcq') {
    if (!block.correctIndices || block.correctIndices.length === 0) {
      return null
    }
    const labels = block.correctIndices
      .map((i) => `${String.fromCharCode(65 + i)}. ${block.options[i] || 'Option'}`)
      .join('; ')
    return `Correct options: ${labels}`
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

  if (block.type === 'short_answer') {
    if (!block.suggestedAnswer) {
      return null
    }
    return `Suggested answer: ${block.suggestedAnswer}`
  }

  if (block.type === 'numeric') {
    if (block.correctAnswer === undefined) {
      return null
    }
    const tolerance = block.tolerance ? ` (±${block.tolerance})` : ''
    const unit = block.unit ? ` ${block.unit}` : ''
    return `Correct answer: ${block.correctAnswer}${tolerance}${unit}`
  }

  if (block.type === 'matching') {
    if (!block.correctPairs || block.correctPairs.length === 0) {
      return null
    }
    const lines = block.correctPairs.map(
      ([li, ri]) => `${block.leftItems[li] ?? li} → ${block.rightItems[ri] ?? ri}`,
    )
    return `Correct pairs:\n${lines.join('\n')}`
  }

  if (block.type === 'ordering') {
    if (!block.correctOrder || block.correctOrder.length === 0) {
      return null
    }
    const ordered = block.correctOrder
      .map((idx) => block.items[idx] ?? idx)
      .join(' → ')
    return `Correct order: ${ordered}`
  }

  return null
}

export const getBlockInstructorNotes = (block: QuestionBlock) =>
  normalizeText(block.instructorNotes)
