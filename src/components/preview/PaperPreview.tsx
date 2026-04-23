import { useState } from 'react'
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'

import { QuestionCard } from '@/components/preview/QuestionCard'
import { Button } from '@/components/ui/Button'
import type { AssetMap, TemplateField, QuestionBlock } from '@/types/exam'

type Props = {
  templateFields: TemplateField[]
  items: QuestionBlock[]
  assets: AssetMap
  selectedBlockId: string | null
  sectionTitle?: string
  sectionInstructions?: string
  questionNumberStart?: number
  onSelect: (blockId: string) => void
  onRequestInsert: (index: number) => void
  onPreviewPdf?: () => void
  onMoveUp: (blockId: string) => void
  onMoveDown: (blockId: string) => void
  onDuplicate: (blockId: string) => void
  onDelete: (blockId: string) => void
  onReorder: (fromIndex: number, toIndex: number) => void
  onAttachImageFile: (blockId: string, file: File) => Promise<void>
  onCanvasDropImage?: (file: File, atIndex?: number) => Promise<void>
}

type PositionedItem = {
  block: QuestionBlock
  index: number
}

const estimateUnits = (block: QuestionBlock) => {
  const promptUnit = Math.max(2, Math.ceil(block.prompt.length / 80))

  if (block.type === 'essay') {
    return promptUnit + (block.answerLines ?? 4)
  }

  if (block.type === 'mcq') {
    return promptUnit + block.options.length * 2
  }

  if (block.type === 'image_question') {
    const imageUnit = block.size === 'large' ? 14 : block.size === 'small' ? 8 : 11
    return promptUnit + imageUnit
  }

  return promptUnit + 4
}

const paginate = (items: PositionedItem[]) => {
  const pages: PositionedItem[][] = []
  let currentPage: PositionedItem[] = []
  let used = 0

  items.forEach((item) => {
    const unit = estimateUnits(item.block)
    if (used + unit > 42 && currentPage.length > 0) {
      pages.push(currentPage)
      currentPage = []
      used = 0
    }
    currentPage.push(item)
    used += unit
  })

  if (currentPage.length > 0) {
    pages.push(currentPage)
  }

  return pages
}

const MetaLine = ({ field }: { field: TemplateField }) => {
  const displayMode = field.displayMode ?? 'label_value'
  const content =
    displayMode === 'value_only'
      ? field.value || '-'
      : `${field.label}: ${field.value || '-'}`

  return (
    <p
      className="text-xs leading-relaxed text-slate-700"
      style={{
        textAlign: field.style?.alignment,
        fontWeight: field.style?.bold ? 700 : undefined,
        fontStyle: field.style?.italics ? 'italic' : undefined,
        textDecoration: field.style?.underline ? 'underline' : undefined,
        fontSize: field.style?.fontSizePt ? `${field.style.fontSizePt}pt` : undefined,
        fontFamily: field.style?.fontFamily,
        color: field.style?.colorHex ? `#${field.style.colorHex}` : undefined,
      }}
    >
      {content}
    </p>
  )
}

const isImageTemplateValue = (value?: string) =>
  Boolean(value?.trim().startsWith('data:image/'))

const InsertButton = ({ onClick }: { onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="my-2 flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 transition hover:border-slate-500 hover:text-slate-700"
  >
    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] text-white">+</span>
    Insert Question Here
  </button>
)

export const PaperPreview = ({
  templateFields,
  items,
  assets,
  selectedBlockId,
  sectionTitle,
  sectionInstructions,
  questionNumberStart = 1,
  onSelect,
  onRequestInsert,
  onPreviewPdf,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  onReorder,
  onAttachImageFile,
  onCanvasDropImage,
}: Props) => {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [isCanvasDropActive, setIsCanvasDropActive] = useState(false)

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  const positioned = items.map((block, index) => ({ block, index }))
  const pages = paginate(positioned)
  const headerFields = templateFields.filter((field) => field.section === 'header')
  const footerFields = templateFields.filter((field) => field.section === 'footer')

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }

    const fromIndex = items.findIndex((item) => item.id === active.id)
    const toIndex = items.findIndex((item) => item.id === over.id)
    if (fromIndex >= 0 && toIndex >= 0) {
      onReorder(fromIndex, toIndex)
    }
  }

  const activeItem = activeId ? items.find((item) => item.id === activeId) : null
  const activeIndex = activeId ? items.findIndex((item) => item.id === activeId) : -1

  const handleCanvasDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsCanvasDropActive(true)
  }

  const handleCanvasDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsCanvasDropActive(false)
  }

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsCanvasDropActive(false)
    if (!onCanvasDropImage) return

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      void onCanvasDropImage(file, items.length)
    }
  }

  return (
    <div
      className={`h-full overflow-y-auto p-4 transition-colors duration-200 ${
        isCanvasDropActive ? 'bg-sky-50' : ''
      }`}
      onDragOver={handleCanvasDragOver}
      onDragLeave={handleCanvasDragLeave}
      onDrop={handleCanvasDrop}
    >
      {isCanvasDropActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm">
          <div className="rounded-xl bg-white p-6 shadow-2xl">
            <p className="text-lg font-bold text-sky-600">Drop image to add to paper</p>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[900px] space-y-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragOver={(event) => {
            if (event.over && event.over.id !== event.active.id) {
              if ('vibrate' in navigator) navigator.vibrate(10)
            }
          }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
            {pages.map((pageItems, pageIndex) => (
              <article
                key={`page-${pageIndex}`}
                className="paper-page mx-auto"
              >
                {pageIndex === 0 ? (
                  <header className="rounded-md border border-slate-300 p-3 mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-center sm:text-left">
                      {headerFields.map((field) =>
                        isImageTemplateValue(field.value) ? (
                          <figure key={field.id} className="flex flex-col items-center gap-1 rounded-md border border-slate-200 p-2">
                            <img
                              src={field.value}
                              alt={field.label || 'Header image'}
                              className="max-h-24 w-auto max-w-full object-contain"
                            />
                            {field.label ? <figcaption className="text-[11px] text-slate-500">{field.label}</figcaption> : null}
                          </figure>
                        ) : (
                          <MetaLine key={field.id} field={field} />
                        ),
                      )}
                    </div>
                  </header>
                ) : null}

                <div className="mt-4">
                  {pageIndex === 0 && (sectionTitle || sectionInstructions) ? (
                    <section className="mb-3 rounded-md border border-slate-200 bg-slate-50 p-3">
                      {sectionTitle ? (
                        <h3 className="text-sm font-semibold text-slate-900">{sectionTitle}</h3>
                      ) : null}
                      {sectionInstructions ? (
                        <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                          {sectionInstructions}
                        </p>
                      ) : null}
                    </section>
                  ) : null}

                  {pageItems.map((item) => (
                    <div key={item.block.id}>
                      <InsertButton onClick={() => onRequestInsert(item.index)} />
                      <QuestionCard
                        block={item.block}
                        index={questionNumberStart + item.index - 1}
                        selected={item.block.id === selectedBlockId}
                        imagePath={
                          item.block.type === 'image_question'
                            ? assets[item.block.assetId]?.path
                            : undefined
                        }
                        onSelect={() => onSelect(item.block.id)}
                        onMoveUp={() => onMoveUp(item.block.id)}
                        onMoveDown={() => onMoveDown(item.block.id)}
                        onDuplicate={() => onDuplicate(item.block.id)}
                        onDelete={() => onDelete(item.block.id)}
                        onAttachImageFile={onAttachImageFile}
                      />
                    </div>
                  ))}

                  {pageIndex === pages.length - 1 ? (
                    <InsertButton onClick={() => onRequestInsert(items.length)} />
                  ) : null}
                </div>

                <footer className="mt-6 border-t border-slate-300 pt-2 text-[11px] text-slate-600">
                  <div className="flex flex-wrap justify-between gap-4">
                    {footerFields.map((field) =>
                      isImageTemplateValue(field.value) ? (
                        <div key={field.id} className="flex items-center gap-2">
                          <img
                            src={field.value}
                            alt={field.label || 'Footer image'}
                            className="max-h-12 w-auto max-w-[140px] object-contain"
                          />
                          {field.label ? <span className="text-[11px] text-slate-500">{field.label}</span> : null}
                        </div>
                      ) : (
                        <span key={field.id} className="whitespace-pre-line">
                          <span className="font-semibold">{field.label}:</span> {field.value}
                        </span>
                      ),
                    )}
                  </div>
                  <div className="text-center mt-2">Page {pageIndex + 1}</div>
                </footer>
              </article>
            ))}
          </SortableContext>
          <DragOverlay
            dropAnimation={{
              sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } }),
            }}
          >
            {activeItem ? (
              <div className="opacity-80 shadow-2xl scale-105 transition-transform">
                <QuestionCard
                  block={activeItem}
                  index={questionNumberStart + activeIndex - 1}
                  selected={activeItem.id === selectedBlockId}
                  imagePath={
                    activeItem.type === 'image_question'
                      ? assets[activeItem.assetId]?.path
                      : undefined
                  }
                  onSelect={() => {}}
                  onMoveUp={() => {}}
                  onMoveDown={() => {}}
                  onDuplicate={() => {}}
                  onDelete={() => {}}
                  onAttachImageFile={async () => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="sticky bottom-4 mt-5 flex justify-center">
        <Button variant="secondary" onClick={() => (onPreviewPdf ? onPreviewPdf() : window.print())}>
          Preview PDF
        </Button>
      </div>
    </div>
  )
}
