import type { BlockType, QuestionBankEntry } from '@/types/exam'
import { Button } from '@/components/ui/Button'

type Props = {
  open: boolean
  insertionIndex: number
  questionBank: QuestionBankEntry[]
  onClose: () => void
  onSelect: (type: BlockType, insertionIndex: number) => void
  onInsertFromBank: (entryId: string, insertionIndex: number) => void
}

const options: Array<{ type: BlockType; label: string; description: string }> = [
  {
    type: 'essay',
    label: 'Short Answer / Essay',
    description: 'Prompt with configurable answer lines.',
  },
  {
    type: 'mcq',
    label: 'Multiple Choice',
    description: 'Prompt with 2 to 6 options and optional answer key.',
  },
  {
    type: 'true_false',
    label: 'True / False',
    description: 'Prompt with boolean answer metadata.',
  },
  {
    type: 'fill_blank',
    label: 'Fill in the Blank',
    description: 'Prompt with blank answers metadata.',
  },
  {
    type: 'image_question',
    label: 'Image Question',
    description: 'Prompt with image, caption, and layout controls.',
  },
]

export const InsertQuestionDialog = ({
  open,
  insertionIndex,
  questionBank,
  onClose,
  onSelect,
  onInsertFromBank,
}: Props) => {
  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35 p-3" role="dialog" aria-modal>
      <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Insert Question</h2>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="grid gap-2">
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => onSelect(option.type, insertionIndex)}
              className="rounded-md border border-slate-200 p-3 text-left transition hover:border-slate-400"
            >
              <p className="text-sm font-semibold text-slate-900">{option.label}</p>
              <p className="mt-1 text-xs text-slate-600">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-slate-200 pt-3">
          <h3 className="text-sm font-semibold text-slate-900">Saved Questions</h3>
          {questionBank.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No saved questions yet.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {questionBank.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-md border border-slate-200 p-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.block.type.replace('_', ' ')}
                  </p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-800">{entry.block.prompt}</p>
                  <button
                    type="button"
                    onClick={() => onInsertFromBank(entry.id, insertionIndex)}
                    className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
                  >
                    Insert Saved Question
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
