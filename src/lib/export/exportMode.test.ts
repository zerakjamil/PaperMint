import { describe, expect, it } from 'vitest'

import type { QuestionBlock } from '@/types/exam'

import {
  getBlockAnswerText,
  getBlockInstructorNotes,
  shouldRenderBlockForMode,
} from './exportMode'

describe('exportMode helpers', () => {
  it('hides instructor-only questions in student mode', () => {
    const block: QuestionBlock = {
      id: 'q-instructor',
      type: 'essay',
      prompt: 'Internal grading calibration question',
      instructorOnly: true,
    }

    expect(shouldRenderBlockForMode(block, 'student')).toBe(false)
    expect(shouldRenderBlockForMode(block, 'instructor')).toBe(true)
    expect(shouldRenderBlockForMode(block, 'answer_key')).toBe(true)
  })

  it('returns canonical answer text for MCQ', () => {
    const block: QuestionBlock = {
      id: 'q-mcq',
      type: 'mcq',
      prompt: 'Pick one',
      options: ['Alpha', 'Beta', 'Gamma'],
      correctIndex: 1,
    }

    expect(getBlockAnswerText(block)).toBe('Correct option: B. Beta')
  })

  it('returns canonical answer text for true/false and fill blank', () => {
    const trueFalse: QuestionBlock = {
      id: 'q-tf',
      type: 'true_false',
      prompt: 'Linux is open source',
      answer: true,
    }

    const fillBlank: QuestionBlock = {
      id: 'q-fill',
      type: 'fill_blank',
      prompt: 'Kernel type is ____',
      answers: ['monolithic', 'hybrid'],
    }

    expect(getBlockAnswerText(trueFalse)).toBe('Correct answer: True')
    expect(getBlockAnswerText(fillBlank)).toBe('Expected answer(s): monolithic; hybrid')
  })

  it('returns normalized instructor notes when present', () => {
    const block: QuestionBlock = {
      id: 'q-essay',
      type: 'essay',
      prompt: 'Discuss paging',
      instructorNotes: '  Reward diagrams and real-world tradeoffs.  ',
    }

    expect(getBlockInstructorNotes(block)).toBe(
      'Reward diagrams and real-world tradeoffs.',
    )
  })
})
