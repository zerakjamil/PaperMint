import { useState } from 'react'

import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'

import { Button } from '@/components/ui/Button'
import { isImageFile } from '@/lib/file-system/imageFile'
import type { QuestionBlock } from '@/types/exam'

type Props = {
  block: QuestionBlock
  index: number
  selected: boolean
  imagePath?: string
  onSelect: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  onDuplicate: () => void
  onDelete: () => void
  onAttachImageFile: (blockId: string, file: File) => Promise<void>
}

const optionLabel = (index: number) => String.fromCharCode(65 + index)

const imageSizeClass = {
  small: 'max-w-[200px]',
  medium: 'max-w-[280px]',
  large: 'max-w-[360px]',
}

export const QuestionCard = ({
  block,
  index,
  selected,
  imagePath,
  onSelect,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onAttachImageFile,
}: Props) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id })
  const [isDropActive, setIsDropActive] = useState(false)

  const runCardAction = (action: () => void) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    action()
  }

  const handleImageDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isDropActive) {
      setIsDropActive(true)
    }
  }

  const handleImageDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDropActive(false)
  }

  const handleImageDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setIsDropActive(false)

    const file = event.dataTransfer.files?.[0]
    if (!file || !isImageFile(file)) {
      return
    }

    void onAttachImageFile(block.id, file)
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`relative rounded-lg border bg-white p-4 transition duration-200 ${
        selected ? 'border-emerald-500 shadow-[0_0_0_1px_rgba(16,185,129,1)]' : 'border-slate-200 hover:border-slate-300'
      } ${isDragging ? 'opacity-70 scale-[0.98]' : ''}`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onSelect()
        }
      }}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-xs text-slate-500">
        <span className="font-semibold select-none">Question {index + 1}</span>
      </div>

      {selected ? (
        <div className="absolute -top-3 right-4 flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-md z-10 animate-in fade-in zoom-in duration-200">
          <button
            type="button"
            aria-label="Drag question"
            className="flex items-center gap-1 cursor-grab active:cursor-grabbing rounded px-2 py-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 font-medium"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
            {...attributes}
            {...listeners}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
            Drag
          </button>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <Button variant="ghost" className="h-7 px-2 py-1 text-xs hover:bg-slate-100 text-slate-600" onClick={runCardAction(onMoveUp)}>
            Up
          </Button>
          <Button variant="ghost" className="h-7 px-2 py-1 text-xs hover:bg-slate-100 text-slate-600" onClick={runCardAction(onMoveDown)}>
            Down
          </Button>
          <div className="h-4 w-px bg-slate-200 mx-1" />
          <Button variant="ghost" className="h-7 px-2 py-1 text-xs hover:bg-slate-100 text-slate-600" onClick={runCardAction(onDuplicate)}>
            Duplicate
          </Button>
          <Button
            variant="ghost"
            className="h-7 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-medium"
            onClick={runCardAction(onDelete)}
          >
            Delete
          </Button>
        </div>
      ) : null}

      <p className="text-sm font-semibold text-slate-900">
        {block.prompt}
        {block.marks ? <span className="text-slate-500"> ({block.marks} marks)</span> : null}
      </p>

      {block.type === 'mcq' ? (
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          {block.options.map((option, optionIndex) => (
            <li key={`${block.id}-${optionLabel(optionIndex)}`}>
              {optionLabel(optionIndex)}. {option}
            </li>
          ))}
        </ul>
      ) : null}

      {block.type === 'true_false' ? (
        <p className="mt-2 text-sm text-slate-700">Answer: {block.answer === undefined ? '____' : block.answer ? 'True' : 'False'}</p>
      ) : null}

      {block.type === 'fill_blank' ? (
        <p className="mt-2 text-sm text-slate-700">Answer space: ______________________</p>
      ) : null}

      {block.type === 'essay' ? (
        <div className="mt-2 space-y-1">
          {Array.from({ length: block.answerLines ?? 4 }).map((_, lineIndex) => (
            <div key={`${block.id}-line-${lineIndex}`} className="h-4 border-b border-dashed border-slate-300" />
          ))}
        </div>
      ) : null}

      {block.type === 'image_question' ? (
        <div className="mt-2 space-y-2 text-sm text-slate-700">
          <div
            data-testid={`image-drop-zone-${block.id}`}
            className={`rounded border border-dashed p-2 transition ${
              isDropActive ? 'border-sky-500 bg-sky-50' : 'border-slate-300'
            }`}
            onDragEnter={handleImageDragOver}
            onDragOver={handleImageDragOver}
            onDragLeave={handleImageDragLeave}
            onDrop={handleImageDrop}
          >
            {imagePath ? (
              <img
                src={imagePath}
                alt="Question visual"
                className={`mx-auto h-auto rounded border border-slate-200 ${
                  imageSizeClass[block.size ?? 'medium']
                }`}
              />
            ) : (
              <p className="rounded border border-dashed border-slate-300 p-3 text-center text-slate-500">
                No image selected
              </p>
            )}
            <p className="mt-2 text-center text-xs text-slate-500">Drop an image here to attach or replace.</p>
          </div>
          {block.caption ? <p className="italic">{block.caption}</p> : null}
        </div>
      ) : null}
    </article>
  )
}
