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
import { isImageSourceValue } from '@/lib/utils/exportLayout'
import type {
  AssetMap,
  TemplateField,
  TemplatePresetId,
  QuestionBlock,
} from '@/types/exam'

type Props = {
  templatePresetId?: TemplatePresetId
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

const isImageTemplateValue = (value: string) => isImageSourceValue(value)

const findField = (fields: TemplateField[], label: string) =>
  fields.find((field) => field.label === label)

const textValue = (field?: TemplateField) => field?.value ?? ''

const fieldText = (fields: TemplateField[], label: string) => textValue(findField(fields, label)).trim()

const extractLegacyValue = (line?: string) => {
  if (!line) return ''
  const parts = line.split('/')
  if (parts.length <= 1) {
    return line.trim()
  }
  return parts.slice(1).join('/').trim()
}

const getShaqlawaMetadata = (fields: TemplateField[]) => {
  const legacyCourseLines = fieldText(fields, 'Course Metadata')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const legacySessionLines = fieldText(fields, 'Session Banner')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const subject = fieldText(fields, 'Subject') || extractLegacyValue(legacyCourseLines[0])
  const department = fieldText(fields, 'Department') || extractLegacyValue(legacyCourseLines[1])
  const stage = fieldText(fields, 'Stage') || extractLegacyValue(legacyCourseLines[2])
  const duration = fieldText(fields, 'Duration') || extractLegacyValue(legacyCourseLines[3])
  const academicYear = fieldText(fields, 'Academic Year') || legacySessionLines[1] || ''
  const round = fieldText(fields, 'Round') || legacySessionLines[2] || ''
  const sessionTitle = legacySessionLines[0] || 'تاقی كردنهوهكانی كۆتایــــی ساڵ'

  const topStripLeft =
    fieldText(fields, 'Top Strip Left') ||
    `بابەت/ ${subject || '-'} / قۆناغ / ${[stage, department].filter(Boolean).join(' ')}`
  const topStripRight = fieldText(fields, 'Top Strip Right') || 'سیریال قوتابی //'

  const hasIndividualCourseFields =
    !!findField(fields, 'Subject') ||
    !!findField(fields, 'Department') ||
    !!findField(fields, 'Stage') ||
    !!findField(fields, 'Duration')

  const courseMetadata = hasIndividualCourseFields
    ? [
        `بابەت/ ${subject || '-'}`,
        `بەشی / ${department || '-'}`,
        `قۆناغ/ ${stage || '-'}`,
        `كات/ ${duration || '-'}`,
      ].join('\n')
    : fieldText(fields, 'Course Metadata')

  const sessionBanner = [sessionTitle, academicYear, round].filter(Boolean).join('\n')

  return {
    topStripLeft,
    topStripRight,
    courseMetadata,
    sessionBanner,
    footerBlessing: fieldText(fields, 'Footer Blessing'),
    lecturerSignature: fieldText(fields, 'Lecturer Signature'),
  }
}

const ShaqlawaCoverPage = ({ fields }: { fields: TemplateField[] }) => {
  const logo = findField(fields, 'Institution Logo')
  const metadata = getShaqlawaMetadata(fields)

  return (
    <div className="relative w-full border border-slate-300" style={{ aspectRatio: '612 / 792' }}>
      <div className="absolute inset-0 bg-white p-6 text-slate-900" dir="rtl">
        <div className="border-2 border-sky-500 px-3 py-1 text-[11px] leading-5">
          <div className="flex items-center justify-between">
            <span>{metadata.topStripLeft}</span>
            <span>{metadata.topStripRight}</span>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-[1fr_1fr_1fr] gap-2">
          <div className="relative min-h-[170px] border-2 border-sky-500 p-3">
            <div className="absolute left-6 top-2 h-28 w-16 rotate-[-40deg] border border-sky-500 bg-stone-100" />
            <div className="mt-20 whitespace-pre-line text-right text-[24px] leading-10">
              {textValue(findField(fields, 'Cover Left Metadata'))}
            </div>
          </div>

          <div className="flex min-h-[170px] flex-col items-center justify-center gap-3 border-2 border-sky-500 p-3 text-center">
            {logo && isImageTemplateValue(logo.value) ? (
              <img src={logo.value} alt="Institution Logo" className="h-20 w-20 object-contain" />
            ) : null}
            <div className="whitespace-pre-line text-[24px] font-semibold leading-10">
              {metadata.sessionBanner}
            </div>
          </div>

          <div className="flex min-h-[170px] flex-col gap-2">
            <div className="border-2 border-sky-500 p-2 text-right text-[16px] leading-6">
              <div className="whitespace-pre-line font-semibold">
                {textValue(findField(fields, 'Institution Name (Kurdish)'))}
              </div>
              <div className="mt-2 text-left text-[18px] font-bold" dir="ltr">
                {textValue(findField(fields, 'Institution Name (English)'))}
              </div>
            </div>
            <div className="border-2 border-sky-500 p-2 text-right text-[30px] leading-10 whitespace-pre-line">
              {metadata.courseMetadata}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[3fr_1fr] items-center gap-2">
          <div className="h-16 border border-orange-500" />
          <div className="border border-yellow-500 bg-yellow-300 p-2 text-center text-[24px] font-bold leading-8 whitespace-pre-line">
            {textValue(findField(fields, 'Student Serial Label'))}
          </div>
        </div>

        <div className="mt-2 border-t-2 border-amber-500">
          <div className="grid grid-cols-[4fr_2fr_2fr_2fr_1fr] border-x border-b border-slate-400 text-center text-[18px]">
            <div className="border-l border-slate-400 p-1">كۆی گشتی نمرهكە</div>
            <div className="border-l border-slate-400 p-1">واژووی وردبین</div>
            <div className="border-l border-slate-400 p-1">واژووی مامۆستا</div>
            <div className="border-l border-slate-400 p-1">نمره</div>
            <div className="p-1">پ</div>
          </div>
          <div className="grid grid-cols-[4fr_2fr_2fr_2fr_1fr] border-x border-b border-slate-400">
            <div className="flex min-h-[260px] items-center justify-center border-l border-slate-400 bg-amber-100">
              <div className="relative flex h-36 w-36 items-center justify-center rounded-full border border-green-500 text-[42px] font-bold">
                60
                <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-500" />
              </div>
            </div>
            <div className="border-l border-slate-400" />
            <div className="border-l border-slate-400" />
            <div className="border-l border-slate-400" />
            <div className="flex flex-col text-center text-[32px] leading-[52px]">
              <span className="border-b border-slate-400">پ1</span>
              <span className="border-b border-slate-400">پ2</span>
              <span className="border-b border-slate-400">پ3</span>
              <span className="border-b border-slate-400">پ4</span>
              <span className="border-b border-slate-400">پ5</span>
              <span className="border-b border-slate-400">پ6</span>
              <span>كۆ</span>
            </div>
          </div>
        </div>

        <div className="mt-3 border border-amber-100 bg-amber-50 p-3 text-[13px] leading-6 whitespace-pre-line">
          <div className="text-right font-semibold">رێنمایی تاقى کردنەوەکان//</div>
          {textValue(findField(fields, 'Cover Instructions'))}
        </div>

        <div className="mt-2 flex items-center justify-between border-2 border-sky-500 px-3 py-2 text-[18px]">
          <span className="whitespace-pre-line text-right">{metadata.lecturerSignature}</span>
          <span className="font-semibold">{metadata.footerBlessing}</span>
        </div>
      </div>
    </div>
  )
}

export const PaperPreview = ({
  templatePresetId,
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
  const coverImageField = templateFields.find(
    (field) =>
      field.section === 'header' &&
      field.label === 'Cover Page Image' &&
      isImageTemplateValue(field.value),
  )
  const hasShaqlawaCover = templatePresetId === 'shaqlawa_linux_gui'
  const shaqlawaMetadata = hasShaqlawaCover ? getShaqlawaMetadata(templateFields) : null
  const questionPages = paginate(positioned)
  const hasCoverPage = Boolean(coverImageField) || hasShaqlawaCover
  const pages = hasCoverPage ? ([[] as PositionedItem[], ...questionPages]) : questionPages
  const headerFields = templateFields.filter(
    (field) => field.section === 'header' && field.label !== 'Cover Page Image',
  )
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
              (() => {
                const isCoverPage = hasCoverPage && pageIndex === 0
                const questionPageIndex = hasCoverPage ? pageIndex - 1 : pageIndex
                const isFirstQuestionPage = questionPageIndex === 0

                return (
              <article
                key={`page-${pageIndex}`}
                className="paper-page mx-auto"
              >
                {isCoverPage && coverImageField ? (
                  <div className="space-y-2">
                    <img
                      src={coverImageField.value}
                      alt={coverImageField.label || 'Cover page image'}
                      className="w-full rounded-sm border border-slate-200 object-contain"
                    />
                  </div>
                ) : null}

                {isCoverPage && !coverImageField && hasShaqlawaCover ? (
                  <ShaqlawaCoverPage fields={templateFields} />
                ) : null}

                {isCoverPage ? (
                  <InsertButton onClick={() => onRequestInsert(0)} />
                ) : null}

                {!isCoverPage && (hasShaqlawaCover || isFirstQuestionPage) ? (
                  hasShaqlawaCover ? (
                    <header className="mb-6 border-2 border-sky-500 px-3 py-1 text-[11px] leading-5" dir="rtl">
                      <div className="flex items-center justify-between">
                        <span>{shaqlawaMetadata?.topStripLeft}</span>
                        <span>{shaqlawaMetadata?.topStripRight}</span>
                      </div>
                    </header>
                  ) : (
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
                  )
                ) : null}

                {!isCoverPage ? (
                  <div className="mt-4">
                    {isFirstQuestionPage && (sectionTitle || sectionInstructions) ? (
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
                ) : null}

                {hasShaqlawaCover && !isCoverPage ? (
                  <footer className="mt-6 space-y-2 text-[11px] text-slate-700" dir="rtl">
                    <div className="flex items-center justify-between border-2 border-sky-500 px-3 py-2 text-[15px]">
                      <span className="whitespace-pre-line text-right">{shaqlawaMetadata?.lecturerSignature}</span>
                      <span className="font-semibold">{shaqlawaMetadata?.footerBlessing}</span>
                    </div>
                    <div className="text-right text-[10px] text-slate-500">Page {pageIndex + 1}</div>
                  </footer>
                ) : !isCoverPage ? (
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
                ) : null}
              </article>
                )
              })()
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
