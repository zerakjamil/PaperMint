import type { ChangeEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { InputField } from '@/components/ui/InputField'
import { Panel } from '@/components/ui/Panel'
import { isImageFile } from '@/lib/file-system/imageFile'
import type { AssetMap, QuestionBlock } from '@/types/exam'

type Props = {
  block: QuestionBlock | null
  assets: AssetMap
  onUpdate: (blockId: string, updater: (value: QuestionBlock) => QuestionBlock) => void
  onAttachImageFile: (blockId: string, file: File) => Promise<void>
}

const blockTitle = {
  essay: 'Essay Block',
  mcq: 'Multiple Choice Block',
  multi_select_mcq: 'Multi-Select MCQ Block',
  true_false: 'True / False Block',
  fill_blank: 'Fill Blank Block',
  short_answer: 'Short Answer Block',
  image_question: 'Image Question Block',
  matching: 'Matching Block',
  ordering: 'Ordering Block',
  numeric: 'Numeric Block',
}

const readImageFromInput = async (
  event: ChangeEvent<HTMLInputElement>,
  blockId: string,
  onAttachImageFile: Props['onAttachImageFile'],
) => {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }

  await onAttachImageFile(blockId, file)
  event.target.value = ''
}

export const RightPropertiesPanel = ({
  block,
  assets,
  onUpdate,
  onAttachImageFile,
}: Props) => {
  if (!block) {
    return (
      <aside className="space-y-3 overflow-y-auto p-3">
        <Panel title="Block Properties">
          <p className="text-sm text-slate-600">Select a question block to edit its properties.</p>
        </Panel>
      </aside>
    )
  }

  const imagePath = block.type === 'image_question' ? assets[block.assetId]?.path : undefined

  return (
    <aside className="space-y-3 overflow-y-auto p-3">
      <Panel title={blockTitle[block.type]}>
        <div className="space-y-2">
          <InputField
            label="Prompt"
            value={block.prompt}
            textarea
            rows={4}
            onChange={(event) =>
              onUpdate(block.id, (value) => ({ ...value, prompt: event.target.value }))
            }
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marks</span>
            <input
              type="number"
              min={0}
              value={block.marks ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  marks:
                    event.target.value === ''
                      ? undefined
                      : Number.parseFloat(event.target.value),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              checked={Boolean(block.instructorOnly)}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  instructorOnly: event.target.checked,
                }))
              }
            />
            Instructor-only question
          </label>

          <InputField
            label="Instructor Notes"
            value={block.instructorNotes ?? ''}
            textarea
            rows={3}
            onChange={(event) =>
              onUpdate(block.id, (value) => ({
                ...value,
                instructorNotes: event.target.value,
              }))
            }
          />
        </div>
      </Panel>

      {block.type === 'essay' ? (
        <Panel title="Essay Settings">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Answer Lines
            </span>
            <input
              type="number"
              min={1}
              max={25}
              value={block.answerLines ?? 4}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  answerLines: Number.parseInt(event.target.value, 10),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </Panel>
      ) : null}

      {block.type === 'mcq' ? (
        <Panel title="Options">
          <div className="space-y-2">
            {block.options.map((option, optionIndex) => (
              <div key={`${block.id}-option-${optionIndex}`} className="flex items-center gap-2">
                <input
                  value={option}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'mcq') {
                        return value
                      }

                      const options = [...value.options]
                      options[optionIndex] = event.target.value
                      return {
                        ...value,
                        options,
                      }
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'mcq' || value.options.length <= 2) {
                        return value
                      }

                      const options = value.options.filter((_, idx) => idx !== optionIndex)
                      return {
                        ...value,
                        options,
                      }
                    })
                  }
                  className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'mcq' || value.options.length >= 6) {
                    return value
                  }
                  return {
                    ...value,
                    options: [...value.options, `Option ${String.fromCharCode(65 + value.options.length)}`],
                  }
                })
              }
            >
              Add Option
            </Button>
          </div>

          <label className="mt-3 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Correct Option Index
            </span>
            <input
              type="number"
              min={0}
              max={Math.max(0, block.options.length - 1)}
              value={block.correctIndex ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  correctIndex:
                    event.target.value === ''
                      ? undefined
                      : Number.parseInt(event.target.value, 10),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </Panel>
      ) : null}

      {block.type === 'true_false' ? (
        <Panel title="True / False Settings">
          <div className="flex gap-2">
            <Button
              variant={block.answer === true ? 'default' : 'secondary'}
              className="w-full"
              onClick={() => onUpdate(block.id, (value) => ({ ...value, answer: true }))}
            >
              True
            </Button>
            <Button
              variant={block.answer === false ? 'default' : 'secondary'}
              className="w-full"
              onClick={() => onUpdate(block.id, (value) => ({ ...value, answer: false }))}
            >
              False
            </Button>
          </div>
        </Panel>
      ) : null}

      {block.type === 'fill_blank' ? (
        <Panel title="Answer Key (Optional)">
          <InputField
            label="Answers (comma separated)"
            value={block.answers?.join(', ') ?? ''}
            onChange={(event) =>
              onUpdate(block.id, (value) => ({
                ...value,
                answers: event.target.value
                  .split(',')
                  .map((item) => item.trim())
                  .filter(Boolean),
              }))
            }
          />
        </Panel>
      ) : null}

      {block.type === 'image_question' ? (
        <Panel title="Image Settings">
          <div
            className="rounded-md border border-dashed border-slate-300 p-3"
            onDragOver={(event) => {
              event.preventDefault()
            }}
            onDrop={async (event) => {
              event.preventDefault()
              const file = event.dataTransfer.files?.[0]
              if (!file || !isImageFile(file)) {
                return
              }
              await onAttachImageFile(block.id, file)
            }}
          >
            <p className="mb-2 text-xs text-slate-500">Drop an image here, pick a file, or paste from clipboard.</p>
            <input
              type="file"
              accept="image/*"
              onChange={(event) => void readImageFromInput(event, block.id, onAttachImageFile)}
              className="w-full rounded-md border border-slate-300 p-2 text-xs"
            />

            <Button
              variant="secondary"
              className="mt-2 w-full"
              onClick={async () => {
                if (!('clipboard' in navigator) || !navigator.clipboard.read) {
                  return
                }

                const clipboardItems = await navigator.clipboard.read()
                for (const item of clipboardItems) {
                  const type = item.types.find((entry) => entry.startsWith('image/'))
                  if (!type) {
                    continue
                  }
                  const blob = await item.getType(type)
                  const file = new File([blob], `pasted-${Date.now()}.png`, { type })
                  await onAttachImageFile(block.id, file)
                  break
                }
              }}
            >
              Paste Image from Clipboard
            </Button>
          </div>

          {imagePath ? (
            <img src={imagePath} alt="Current asset" className="mt-2 w-full rounded-md border border-slate-200" />
          ) : null}

          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Caption</span>
            <input
              value={block.caption ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({ ...value, caption: event.target.value }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Layout</span>
            <select
              value={block.layout ?? 'top'}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  layout: event.target.value as 'top' | 'left' | 'right',
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="top">Top</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>
          </label>

          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Size</span>
            <select
              value={block.size ?? 'medium'}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  size: event.target.value as 'small' | 'medium' | 'large',
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </label>
        </Panel>
      ) : null}

      {block.type === 'multi_select_mcq' ? (
        <Panel title="Multi-Select Options">
          <div className="space-y-2">
            {block.options.map((option, optionIndex) => (
              <div key={`${block.id}-option-${optionIndex}`} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={block.correctIndices?.includes(optionIndex) ?? false}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'multi_select_mcq') return value
                      const indices = [...(value.correctIndices ?? [])]
                      if (event.target.checked) {
                        if (!indices.includes(optionIndex)) indices.push(optionIndex)
                      } else {
                        const pos = indices.indexOf(optionIndex)
                        if (pos >= 0) indices.splice(pos, 1)
                      }
                      return { ...value, correctIndices: indices }
                    })
                  }
                />
                <input
                  value={option}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'multi_select_mcq') return value
                      const options = [...value.options]
                      options[optionIndex] = event.target.value
                      return { ...value, options }
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'multi_select_mcq' || value.options.length <= 3) return value
                      const options = value.options.filter((_, idx) => idx !== optionIndex)
                      const correctIndices = value.correctIndices
                        ?.filter((i) => i !== optionIndex)
                        .map((i) => (i > optionIndex ? i - 1 : i))
                      return { ...value, options, correctIndices }
                    })
                  }
                  className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'multi_select_mcq' || value.options.length >= 8) return value
                  return {
                    ...value,
                    options: [...value.options, `Option ${String.fromCharCode(65 + value.options.length)}`],
                  }
                })
              }
            >
              Add Option
            </Button>
          </div>
        </Panel>
      ) : null}

      {block.type === 'short_answer' ? (
        <Panel title="Short Answer Settings">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Answer Lines</span>
            <input
              type="number"
              min={1}
              max={10}
              value={block.answerLines ?? 3}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  answerLines: Number.parseInt(event.target.value, 10),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Max Words</span>
            <input
              type="number"
              min={0}
              value={block.maxWords ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => ({
                  ...value,
                  maxWords: event.target.value === '' ? undefined : Number.parseInt(event.target.value, 10),
                }))
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <InputField
            label="Suggested Answer"
            value={block.suggestedAnswer ?? ''}
            textarea
            rows={3}
            onChange={(event) =>
              onUpdate(block.id, (value) => {
                if (value.type !== 'short_answer') return value
                return { ...value, suggestedAnswer: event.target.value }
              })
            }
          />
        </Panel>
      ) : null}

      {block.type === 'matching' ? (
        <Panel title="Matching Settings">
          <div className="space-y-2">
            {block.leftItems.map((leftItem, i) => (
              <div key={`${block.id}-match-${i}`} className="flex items-center gap-2">
                <span className="text-xs w-8">{String.fromCharCode(65 + i)}.</span>
                <input
                  value={leftItem}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'matching') return value
                      const leftItems = [...value.leftItems]
                      leftItems[i] = event.target.value
                      return { ...value, leftItems }
                    })
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="Left item"
                />
                <span className="text-xs">→</span>
                <input
                  value={i < block.rightItems.length ? block.rightItems[i] : ''}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'matching') return value
                      const rightItems = [...value.rightItems]
                      rightItems[i] = event.target.value
                      return { ...value, rightItems }
                    })
                  }
                  className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm"
                  placeholder="Right item"
                />
                {block.leftItems.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(block.id, (value) => {
                        if (value.type !== 'matching') return value
                        return {
                          ...value,
                          leftItems: value.leftItems.filter((_, idx) => idx !== i),
                          rightItems: value.rightItems.filter((_, idx) => idx !== i),
                        }
                      })
                    }
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                  >
                    X
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'matching') return value
                  return {
                    ...value,
                    leftItems: [...value.leftItems, `Item ${value.leftItems.length + 1}`],
                    rightItems: [...value.rightItems, `Match ${value.rightItems.length + 1}`],
                  }
                })
              }
            >
              Add Pair
            </Button>
          </div>
        </Panel>
      ) : null}

      {block.type === 'ordering' ? (
        <Panel title="Ordering Items">
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={`${block.id}-order-${i}`} className="flex items-center gap-2">
                <span className="text-xs w-6">{i + 1}.</span>
                <input
                  value={item}
                  onChange={(event) =>
                    onUpdate(block.id, (value) => {
                      if (value.type !== 'ordering') return value
                      const items = [...value.items]
                      items[i] = event.target.value
                      return { ...value, items }
                    })
                  }
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                />
                {block.items.length > 2 ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdate(block.id, (value) => {
                        if (value.type !== 'ordering') return value
                        return { ...value, items: value.items.filter((_, idx) => idx !== i) }
                      })
                    }
                    className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
                  >
                    X
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'ordering') return value
                  return {
                    ...value,
                    items: [...value.items, `Step ${value.items.length + 1}`],
                  }
                })
              }
            >
              Add Step
            </Button>
          </div>
        </Panel>
      ) : null}

      {block.type === 'numeric' ? (
        <Panel title="Numeric Answer Settings">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correct Answer</span>
            <input
              type="number"
              step="any"
              value={block.correctAnswer ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'numeric') return value
                  return {
                    ...value,
                    correctAnswer: event.target.value === '' ? undefined : Number.parseFloat(event.target.value),
                  }
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tolerance</span>
            <input
              type="number"
              step="0.01"
              value={block.tolerance ?? 0.01}
              onChange={(event) =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'numeric') return value
                  return { ...value, tolerance: Number.parseFloat(event.target.value) || 0.01 }
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="mt-2 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Unit (optional)</span>
            <input
              type="text"
              value={block.unit ?? ''}
              onChange={(event) =>
                onUpdate(block.id, (value) => {
                  if (value.type !== 'numeric') return value
                  return { ...value, unit: event.target.value || undefined }
                })
              }
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="e.g. m/s, kg, °C"
            />
          </label>
        </Panel>
      ) : null}
    </aside>
  )
}
