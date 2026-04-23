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

  it('renders Shaqlawa strip header and lecturer footer on question pages', () => {
    const shaqlawaFields: TemplateField[] = [
      {
        id: 'cover-image',
        section: 'header',
        label: 'Cover Page Image',
        value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO6sL3QAAAAASUVORK5CYII=',
        displayMode: 'value_only',
      },
      { id: 'top-left', section: 'header', label: 'Top Strip Left', value: 'بابەت/ Test Subject / قۆناغ / 2 کۆمپیوتەر' },
      { id: 'top-right', section: 'header', label: 'Top Strip Right', value: 'سیریال قوتابی //' },
      { id: 'blessing', section: 'footer', label: 'Footer Blessing', value: 'بەهیوای سەركەوتن' },
      { id: 'lecturer', section: 'footer', label: 'Lecturer Signature', value: 'مامۆستای بابەت\nTester Name' },
    ]

    render(
      <PaperPreview
        templatePresetId="shaqlawa_linux_gui"
        templateFields={shaqlawaFields}
        items={[essayBlock]}
        assets={{}}
        selectedBlockId={null}
        onSelect={vi.fn()}
        onRequestInsert={vi.fn()}
        onMoveUp={vi.fn()}
        onMoveDown={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
        onAttachImageFile={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByText('بابەت/ Test Subject / قۆناغ / 2 کۆمپیوتەر')).toBeInTheDocument()
    expect(screen.getByText('بەهیوای سەركەوتن')).toBeInTheDocument()
    expect(screen.getByText((content) => content.includes('Tester Name'))).toBeInTheDocument()
  })
})
