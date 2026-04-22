import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { PaperPreview } from '@/components/preview/PaperPreview'
import type { TemplateField, QuestionBlock } from '@/types/exam'

const templateFields: TemplateField[] = [
  { id: '1', label: 'University Name', value: 'University Name', section: 'header' },
  { id: '2', label: 'College / Department', value: 'College Name - Department Name', section: 'header' },
  { id: '3', label: 'Exam Info', value: 'Final Examination - Subject Name', section: 'header' },
]

const imageQuestionBlock: QuestionBlock = {
  id: 'question-1',
  type: 'image_question',
  prompt: 'Analyze the image and answer.',
  assetId: 'asset-1',
  size: 'medium',
  layout: 'top',
}

const renderPreview = (onAttachImageFile = vi.fn().mockResolvedValue(undefined)) => {
  render(
    <PaperPreview
      templateFields={templateFields}
      items={[imageQuestionBlock]}
      assets={{}}
      selectedBlockId={null}
      onSelect={vi.fn()}
      onRequestInsert={vi.fn()}
      onMoveUp={vi.fn()}
      onMoveDown={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
      onReorder={vi.fn()}
      onAttachImageFile={onAttachImageFile}
    />,
  )

  return {
    onAttachImageFile,
    dropZone: screen.getByTestId('image-drop-zone-question-1'),
  }
}

describe('PaperPreview image drop upload', () => {
  it('attaches image file dropped onto image question card', async () => {
    const { onAttachImageFile, dropZone } = renderPreview()
    const file = new File(['test-image'], 'diagram.png', { type: 'image/png' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(onAttachImageFile).toHaveBeenCalledTimes(1)
    })
    expect(onAttachImageFile).toHaveBeenCalledWith('question-1', file)
  })

  it('attaches image file when dropped MIME type is missing but extension is image-like', async () => {
    const { onAttachImageFile, dropZone } = renderPreview()
    const file = new File(['test-image'], 'diagram.png', { type: '' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(onAttachImageFile).toHaveBeenCalledTimes(1)
    })
    expect(onAttachImageFile).toHaveBeenCalledWith('question-1', file)
  })

  it('ignores non-image files dropped onto image question card', async () => {
    const { onAttachImageFile, dropZone } = renderPreview()
    const file = new File(['plain-text'], 'notes.txt', { type: 'text/plain' })

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    })

    await waitFor(() => {
      expect(onAttachImageFile).not.toHaveBeenCalled()
    })
  })
})