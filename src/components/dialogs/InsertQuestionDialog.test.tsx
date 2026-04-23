import { fireEvent, render, screen } from '@testing-library/react'

import type { QuestionBankEntry } from '@/types/exam'
import { InsertQuestionDialog } from '@/components/dialogs/InsertQuestionDialog'

const now = '2026-04-23T00:00:00.000Z'

const bankEntries: QuestionBankEntry[] = [
  {
    id: 'bank-1',
    block: {
      id: 'block-1',
      type: 'essay',
      prompt: 'Explain ACID properties.',
      answerLines: 5,
      marks: 10,
    },
    tags: ['dbms'],
    createdAt: now,
    updatedAt: now,
  },
]

describe('InsertQuestionDialog', () => {
  it('keeps block-type insertion behavior', () => {
    const onSelect = vi.fn()

    render(
      <InsertQuestionDialog
        open
        insertionIndex={2}
        questionBank={[]}
        onClose={vi.fn()}
        onSelect={onSelect}
        onInsertFromBank={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /short answer/i }))
    expect(onSelect).toHaveBeenCalledWith('essay', 2)
  })

  it('inserts saved bank question from dialog', () => {
    const onInsertFromBank = vi.fn()

    render(
      <InsertQuestionDialog
        open
        insertionIndex={1}
        questionBank={bankEntries}
        onClose={vi.fn()}
        onSelect={vi.fn()}
        onInsertFromBank={onInsertFromBank}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /insert saved question/i }))
    expect(onInsertFromBank).toHaveBeenCalledWith('bank-1', 1)
  })
})
