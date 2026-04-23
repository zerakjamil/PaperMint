import { fireEvent, render, screen } from '@testing-library/react'

import { PaperPreview } from '@/components/preview/PaperPreview'
import type { TemplateField, QuestionBlock } from '@/types/exam'

const templateFields: TemplateField[] = [
  { id: '1', label: 'Exam', value: 'Midterm', section: 'header' },
]

const essayBlock: QuestionBlock = {
  id: 'question-1',
  type: 'essay',
  prompt: 'Explain event bubbling in JavaScript.',
  answerLines: 4,
}

describe('PaperPreview actions', () => {
  it('triggers delete callback from card action button', () => {
    const onDelete = vi.fn()

    render(
      <PaperPreview
        templateFields={templateFields}
        items={[essayBlock]}
        assets={{}}
        selectedBlockId={'question-1'}
        onSelect={vi.fn()}
        onRequestInsert={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={onDelete}
        onReorder={vi.fn()}
        onAttachImageFile={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith('question-1')
  })
})
