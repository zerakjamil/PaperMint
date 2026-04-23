import { useMemo, useState, useRef, useEffect, type ChangeEvent } from 'react'

import { downloadBlob } from '@/lib/file-system/projectFile'
import {
  parseTemplatePack,
  serializeTemplatePack,
} from '@/features/template/templatePack'
import { templatePresets } from '@/features/template/templateLibrary'
import { scanTemplateImage } from '@/features/template/ocrScanner'
import type { ValidationWarning } from '@/features/validation/examValidation'
import { isImageSourceValue } from '@/lib/utils/exportLayout'
import type {
  SnippetEntry,
  SnippetKind,
  TemplateField,
  TemplatePresetId,
  QuestionBlock,
} from '@/types/exam'
import { InputField } from '@/components/ui/InputField'
import { Panel } from '@/components/ui/Panel'

type TemplateFieldUpdates = Partial<
  Pick<TemplateField, 'label' | 'value' | 'displayMode' | 'style'>
>

type Props = {
  templateFields: TemplateField[]
  sections: Array<{ id: string; title?: string; instructions?: string; itemCount: number; totalMarks: number }>
  selectedSectionId: string
  items: QuestionBlock[]
  selectedBlockId: string | null
  targetTotalMarks?: number
  paperTotalMarks: number
  numberingMode: 'global' | 'per_section'
  templatePresetId?: TemplatePresetId
  validationWarnings: ValidationWarning[]
  highlightedTemplateFieldId?: string | null
  snippets: SnippetEntry[]
  onTemplateFieldAdd: (section: 'header' | 'footer') => void
  onTemplateFieldUpdate: (id: string, updates: TemplateFieldUpdates) => void
  onTemplateFieldRemove: (id: string) => void
  onReplaceTemplateFields: (
    templateFields: TemplateField[],
    templatePresetId?: TemplatePresetId,
  ) => void
  onApplyTemplatePreset: (presetId: TemplatePresetId) => void
  onAddSection: () => void
  onSelectSection: (sectionId: string) => void
  onUpdateSection: (sectionId: string, updates: { title?: string; instructions?: string }) => void
  onDuplicateSection: (sectionId: string) => void
  onDeleteSection: (sectionId: string) => void
  onSetTargetTotalMarks: (value: number | undefined) => void
  onSetNumberingMode: (mode: 'global' | 'per_section') => void
  onSaveBlockToBank: (blockId: string, tags?: string[]) => void
  onSaveSnippet: (payload: {
    kind: SnippetKind
    title: string
    content: string
    tags?: string[]
  }) => void
  onApplySnippetToSection: (snippetId: string, sectionId: string) => void
  onApplySnippetToBlock: (snippetId: string, blockId: string) => void
  onApplySnippetToTemplateField: (snippetId: string, fieldId: string) => void
  onSelectBlock: (blockId: string) => void
}

const blockTitle = (type: QuestionBlock['type']) => {
  if (type === 'essay') return 'Essay'
  if (type === 'mcq') return 'MCQ'
  if (type === 'true_false') return 'True/False'
  if (type === 'fill_blank') return 'Fill Blank'
  return 'Image'
}

const isImageTemplateValue = (value: string) => isImageSourceValue(value)

const looksLikeLogoField = (field: TemplateField) =>
  field.section === 'header' && /logo/i.test(field.label)

const readTemplateImage = async (event: ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) {
    return null
  }

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read template image.'))
    reader.readAsDataURL(file)
  })
}

type TemplateFieldEditorProps = {
  field: TemplateField
  isFooter: boolean
  highlighted: boolean
  onTemplateFieldUpdate: Props['onTemplateFieldUpdate']
  onTemplateFieldRemove: Props['onTemplateFieldRemove']
}

const TemplateFieldEditor = ({
  field,
  isFooter,
  highlighted,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
}: TemplateFieldEditorProps) => {
  const isImage = isImageTemplateValue(field.value)
  const isLocked = Boolean(field.locked)
  const isFormatLocked = Boolean(field.formatLocked)
  const displayMode = field.displayMode ?? 'label_value'
  const style = field.style ?? {}

  return (
    <div
      className={`relative space-y-2 rounded-md border p-2 ${
        highlighted ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200'
      }`}
    >
      {!isLocked ? (
        <button
          type="button"
          className="absolute right-2 top-2 text-[10px] text-red-500"
          onClick={() => onTemplateFieldRemove(field.id)}
        >
          remove
        </button>
      ) : (
        <span className="absolute right-2 top-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
          locked
        </span>
      )}

      <input
        value={field.label}
        onChange={(e) => onTemplateFieldUpdate(field.id, { label: e.target.value })}
        disabled={isLocked}
        className="w-full border-b border-transparent bg-transparent pr-14 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:border-slate-500 focus:outline-none"
      />

      {isImage ? (
        <div className="space-y-2">
          <img
            src={field.value}
            alt={field.label || 'Template image'}
            className="max-h-28 w-full rounded-md border border-slate-200 object-contain"
          />
          <button
            type="button"
            className="text-xs font-medium text-slate-600 hover:text-slate-800"
            onClick={() => onTemplateFieldUpdate(field.id, { value: '' })}
            disabled={isLocked}
          >
            Switch to text value
          </button>
        </div>
      ) : (
        <InputField
          label=""
          textarea={isFooter}
          rows={isFooter ? 2 : 1}
          value={field.value}
          onChange={(e) => onTemplateFieldUpdate(field.id, { value: e.target.value })}
          disabled={isLocked}
        />
      )}

      {!isImage && !isFormatLocked ? (
        <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-50 p-2">
          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Display Mode
            </span>
            <select
              value={displayMode}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  displayMode: event.target.value as 'label_value' | 'value_only',
                })
              }
            >
              <option value="label_value">Label + Value</option>
              <option value="value_only">Value only</option>
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Alignment
            </span>
            <select
              value={style.alignment ?? (isFooter ? 'left' : 'center')}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    alignment: event.target.value as 'left' | 'center' | 'right' | 'justify',
                  },
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
              <option value="justify">Justify</option>
            </select>
          </label>

          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              checked={Boolean(style.bold)}
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    bold: event.target.checked,
                  },
                })
              }
            />
            Bold
          </label>
          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              checked={Boolean(style.italics)}
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    italics: event.target.checked,
                  },
                })
              }
            />
            Italic
          </label>
          <label className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <input
              type="checkbox"
              checked={Boolean(style.underline)}
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    underline: event.target.checked,
                  },
                })
              }
            />
            Underline
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Font Size (pt)
            </span>
            <input
              type="number"
              min={8}
              max={36}
              value={style.fontSizePt ?? ''}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    fontSizePt:
                      event.target.value === ''
                        ? undefined
                        : Number.parseInt(event.target.value, 10),
                  },
                })
              }
            />
          </label>

          <label className="col-span-2 flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Font Family
            </span>
            <input
              type="text"
              value={style.fontFamily ?? ''}
              className="rounded-md border border-slate-300 px-2 py-1 text-xs"
              placeholder="Times New Roman"
              onChange={(event) =>
                onTemplateFieldUpdate(field.id, {
                  style: {
                    fontFamily: event.target.value || undefined,
                  },
                })
              }
            />
          </label>
        </div>
      ) : null}

      <label className="flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Upload image
        </span>
        <input
          type="file"
          accept="image/*"
          className="w-full rounded-md border border-slate-300 p-1 text-xs"
          disabled={isLocked}
          onChange={async (event) => {
            const dataUrl = await readTemplateImage(event)
            if (dataUrl) {
              onTemplateFieldUpdate(field.id, { value: dataUrl })
            }
          }}
        />
      </label>

      {isFormatLocked ? (
        <p className="text-[10px] text-slate-500">Formatting enforced by selected template preset.</p>
      ) : null}
    </div>
  )
}

export const LeftSidebar = ({
  templateFields,
  sections,
  selectedSectionId,
  items,
  selectedBlockId,
  targetTotalMarks,
  paperTotalMarks,
  numberingMode,
  templatePresetId,
  validationWarnings,
  highlightedTemplateFieldId,
  snippets,
  onTemplateFieldAdd,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
  onReplaceTemplateFields,
  onApplyTemplatePreset,
  onAddSection,
  onSelectSection,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onSetTargetTotalMarks,
  onSetNumberingMode,
  onSaveBlockToBank,
  onSaveSnippet,
  onApplySnippetToSection,
  onApplySnippetToBlock,
  onApplySnippetToTemplateField,
  onSelectBlock,
}: Props) => {
  const currentSection = sections.find((section) => section.id === selectedSectionId)
  const selectedBlock = useMemo(
    () => items.find((item) => item.id === selectedBlockId) ?? null,
    [items, selectedBlockId],
  )
  const marksMismatch =
    typeof targetTotalMarks === 'number' && Math.abs(targetTotalMarks - paperTotalMarks) > 0.0001

  const [snippetTitle, setSnippetTitle] = useState('')
  const [snippetContent, setSnippetContent] = useState('')
  const [snippetKind, setSnippetKind] = useState<SnippetKind>('instruction')
  const [templateLibraryStatus, setTemplateLibraryStatus] = useState('')
  const [scannerProgress, setScannerProgress] = useState(0)
  const [isScanning, setIsScanning] = useState(false)

  const logoField = useMemo(
    () =>
      templateFields.find(looksLikeLogoField) ??
      templateFields.find(
        (field) =>
          field.section === 'header' && isImageTemplateValue(field.value),
      ) ??
      null,
    [templateFields],
  )

  const canSaveSnippet = snippetTitle.trim().length > 0 && snippetContent.trim().length > 0

  const selectedSectionRef = useRef<HTMLButtonElement>(null)
  const selectedBlockRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (selectedSectionRef.current) {
      selectedSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedSectionId])

  useEffect(() => {
    if (selectedBlockRef.current) {
      selectedBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedBlockId])

  return (
  <aside className="space-y-3 overflow-y-auto p-3">
    <Panel title="Template Library">
      <div className="space-y-2">
        <select
          className="w-full rounded-md border border-slate-300 px-2 py-2 text-xs"
          value={templatePresetId ?? 'default_university'}
          onChange={(event) =>
            onApplyTemplatePreset(
                event.target.value as TemplatePresetId,
            )
          }
        >
          {templatePresets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-slate-500">
          {templatePresets.find((preset) => preset.id === (templatePresetId ?? 'default_university'))
            ?.description ?? 'Preset'}
        </p>

        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            One-minute setup
          </p>
          <p className="text-[11px] text-slate-500">
            Upload logo, then export/import this exact header/footer as a reusable pack.
          </p>

          {logoField && isImageTemplateValue(logoField.value) ? (
            <img
              src={logoField.value}
              alt="Current institution logo"
              className="max-h-16 w-full rounded-md border border-slate-200 object-contain bg-white"
            />
          ) : null}

          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              Institution Logo
            </span>
            <input
              type="file"
              accept="image/*"
              className="w-full rounded-md border border-slate-300 p-1 text-xs"
              onChange={async (event) => {
                const dataUrl = await readTemplateImage(event)
                if (!dataUrl) {
                  return
                }

                if (!logoField) {
                  setTemplateLibraryStatus(
                    'No logo slot found. Apply a preset first, then upload logo.',
                  )
                  return
                }

                onTemplateFieldUpdate(logoField.id, { value: dataUrl })
                setTemplateLibraryStatus('Logo updated for current paper header.')
              }}
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
              onClick={() => {
                const content = serializeTemplatePack({
                  templateFields,
                  templatePresetId,
                })

                downloadBlob(
                  new Blob([content], { type: 'application/json' }),
                  `papermint-template-${templatePresetId ?? 'custom'}.json`,
                )
                setTemplateLibraryStatus('Template pack exported.')
              }}
            >
              Export Pack
            </button>

            <label className="cursor-pointer rounded-md border border-slate-300 px-2 py-1 text-center text-xs font-medium text-slate-700 hover:border-slate-400">
              Import Pack
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) {
                    return
                  }

                  try {
                    const pack = parseTemplatePack(await file.text())
                    onReplaceTemplateFields(pack.templateFields, pack.templatePresetId)
                    setTemplateLibraryStatus(
                      `Imported ${pack.templateFields.length} template field(s).`,
                    )
                  } catch (error) {
                    setTemplateLibraryStatus((error as Error).message)
                  }
                }}
              />
            </label>
          </div>

          <div className="mt-2 space-y-2 rounded-md border border-amber-200 bg-amber-50/50 p-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
              Auto-Extract via OCR Scan
            </p>
            <p className="text-[11px] text-amber-600">
              Upload a scanned exam. We will auto-detect the header/footer zones, extract text, and auto-place the logo.
            </p>
            <label className={`block cursor-pointer rounded-md border border-amber-300 bg-white px-2 py-1.5 text-center text-xs font-medium text-amber-700 hover:bg-amber-50 ${isScanning ? 'opacity-50 pointer-events-none' : ''}`}>
              {isScanning ? `Scanning... ${scannerProgress}%` : 'Upload Scanned Paper Image'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isScanning}
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return

                  try {
                    setIsScanning(true)
                    setScannerProgress(0)
                    setTemplateLibraryStatus('Initiating OCR scan...')
                    const reader = new FileReader()
                    const dataUrl = await new Promise<string>((resolve, reject) => {
                      reader.onload = () => resolve(reader.result as string)
                      reader.onerror = reject
                      reader.readAsDataURL(file)
                    })
                    
                    const fields = await scanTemplateImage(dataUrl, (prog, msg) => {
                        setScannerProgress(prog)
                        setTemplateLibraryStatus(msg)
                    })
                    
                    onReplaceTemplateFields(fields)
                    setTemplateLibraryStatus('Scanned template applied.')
                  } catch (err) {
                    setTemplateLibraryStatus('Scan failed: ' + (err as Error).message)
                  } finally {
                    setIsScanning(false)
                  }
                }}
              />
            </label>
          </div>

          {templateLibraryStatus ? (
            <p className="text-[11px] text-slate-600">{templateLibraryStatus}</p>
          ) : null}
        </div>
      </div>
    </Panel>

    <Panel title="Sections">
      <div className="space-y-2">
        {sections.map((section, index) => (
          <button
            key={section.id}
            type="button"
            ref={section.id === selectedSectionId ? selectedSectionRef : null}
            onClick={() => onSelectSection(section.id)}
            className={`w-full rounded-md px-2 py-2 text-left text-xs transition ${
              section.id === selectedSectionId
                ? 'bg-slate-900 text-white'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="font-semibold">{section.title?.trim() || `Section ${index + 1}`}</div>
            <div className="text-[10px] opacity-80">
              {section.itemCount} question(s) · {section.totalMarks} marks
            </div>
          </button>
        ))}
        <button
          type="button"
          onClick={onAddSection}
          className="text-xs font-medium text-blue-600"
        >
          + Add Section
        </button>

        {currentSection ? (
          <div className="space-y-2 rounded-md border border-slate-200 p-2">
            <InputField
              label="Section Title"
              value={currentSection.title ?? ''}
              onChange={(event) =>
                onUpdateSection(currentSection.id, { title: event.target.value })
              }
            />
            <InputField
              label="Section Instructions"
              textarea
              rows={3}
              value={currentSection.instructions ?? ''}
              onChange={(event) =>
                onUpdateSection(currentSection.id, { instructions: event.target.value })
              }
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onDuplicateSection(currentSection.id)}
                className="rounded border border-slate-300 px-2 py-1 text-xs"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() => onDeleteSection(currentSection.id)}
                className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700"
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </Panel>

    <Panel title="Marks Engine">
      <div className="space-y-2 text-xs">
        <label className="flex flex-col gap-1">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Target Total Marks</span>
          <input
            type="number"
            min={0}
            value={targetTotalMarks ?? ''}
            onChange={(event) =>
              onSetTargetTotalMarks(
                event.target.value === ''
                  ? undefined
                  : Number.parseFloat(event.target.value),
              )
            }
            className="w-full rounded-md border border-slate-300 px-2 py-1"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-semibold uppercase tracking-wide text-slate-500">Numbering Mode</span>
          <select
            value={numberingMode}
            className="w-full rounded-md border border-slate-300 px-2 py-1"
            onChange={(event) => onSetNumberingMode(event.target.value as 'global' | 'per_section')}
          >
            <option value="global">Global (Q1..Qn)</option>
            <option value="per_section">Per section (Q1 restart)</option>
          </select>
        </label>
        <div className="rounded-md bg-slate-50 p-2 text-[11px]">
          <div>Paper total: {paperTotalMarks}</div>
          <div>Current section: {currentSection?.totalMarks ?? 0}</div>
          <div className={marksMismatch ? 'text-amber-700 font-semibold' : 'text-slate-600'}>
            {typeof targetTotalMarks === 'number'
              ? `Target: ${targetTotalMarks}${marksMismatch ? ' (mismatch)' : ' (ok)'}`
              : 'Set target to enforce mark consistency'}
          </div>
        </div>
      </div>
    </Panel>

    <Panel title="Template Fields (Header)">
      <div className="space-y-4">
        {templateFields
          .filter((f) => f.section === 'header')
          .map((field) => (
            <TemplateFieldEditor
              key={field.id}
              field={field}
              isFooter={false}
              highlighted={field.id === highlightedTemplateFieldId}
              onTemplateFieldUpdate={onTemplateFieldUpdate}
              onTemplateFieldRemove={onTemplateFieldRemove}
            />
          ))}
        <button type="button" onClick={() => onTemplateFieldAdd('header')} className="text-xs text-blue-600 font-medium">+ Add Header Field</button>
      </div>
    </Panel>

    <Panel title="Template Fields (Footer)">
      <div className="space-y-4">
        {templateFields
          .filter((f) => f.section === 'footer')
          .map((field) => (
            <TemplateFieldEditor
              key={field.id}
              field={field}
              isFooter
              highlighted={field.id === highlightedTemplateFieldId}
              onTemplateFieldUpdate={onTemplateFieldUpdate}
              onTemplateFieldRemove={onTemplateFieldRemove}
            />
          ))}
        <button type="button" onClick={() => onTemplateFieldAdd('footer')} className="text-xs text-blue-600 font-medium">+ Add Footer Field</button>
      </div>
    </Panel>

    <Panel title="Question Outline">
      {selectedBlock ? (
        <button
          type="button"
          onClick={() => onSaveBlockToBank(selectedBlock.id, [])}
          className="mb-2 w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400"
        >
          Save Selected Question to Bank
        </button>
      ) : null}
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              ref={item.id === selectedBlockId ? selectedBlockRef : null}
              onClick={() => onSelectBlock(item.id)}
              className={`w-full rounded-md px-2 py-2 text-left text-sm transition ${
                selectedBlockId === item.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Q{index + 1} · {blockTitle(item.type)}
            </button>
          </li>
        ))}
      </ul>
    </Panel>

    <Panel title="Reusable Snippets">
      <div className="space-y-2">
        <InputField
          label="Snippet Title"
          value={snippetTitle}
          onChange={(event) => setSnippetTitle(event.target.value)}
        />
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kind</span>
          <select
            value={snippetKind}
            onChange={(event) => setSnippetKind(event.target.value as SnippetKind)}
            className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="instruction">Instruction</option>
            <option value="header">Header</option>
            <option value="footer">Footer</option>
            <option value="note">Note</option>
          </select>
        </label>
        <InputField
          label="Snippet Content"
          textarea
          rows={3}
          value={snippetContent}
          onChange={(event) => setSnippetContent(event.target.value)}
        />
        <button
          type="button"
          disabled={!canSaveSnippet}
          onClick={() => {
            if (!canSaveSnippet) {
              return
            }
            onSaveSnippet({
              kind: snippetKind,
              title: snippetTitle.trim(),
              content: snippetContent.trim(),
              tags: [],
            })
            setSnippetTitle('')
            setSnippetContent('')
            setSnippetKind('instruction')
          }}
          className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Save Snippet
        </button>

        {snippets.length === 0 ? (
          <p className="text-xs text-slate-500">No snippets yet.</p>
        ) : (
          <div className="space-y-2">
            {snippets.slice(0, 6).map((snippet) => (
              <div key={snippet.id} className="rounded-md border border-slate-200 p-2">
                <p className="text-xs font-semibold text-slate-800">{snippet.title}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">{snippet.content}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {currentSection ? (
                    <button
                      type="button"
                      onClick={() => onApplySnippetToSection(snippet.id, currentSection.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700"
                    >
                      Apply to Section
                    </button>
                  ) : null}
                  {selectedBlock ? (
                    <button
                      type="button"
                      onClick={() => onApplySnippetToBlock(snippet.id, selectedBlock.id)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700"
                    >
                      Apply to Prompt
                    </button>
                  ) : null}
                  {highlightedTemplateFieldId ? (
                    <button
                      type="button"
                      onClick={() => onApplySnippetToTemplateField(snippet.id, highlightedTemplateFieldId)}
                      className="rounded border border-slate-300 px-2 py-1 text-[10px] text-slate-700"
                    >
                      Apply to Highlighted Field
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>

    <Panel title="Pre-export Validation">
      {validationWarnings.length === 0 ? (
        <p className="text-xs text-emerald-700">No warnings. Ready to export.</p>
      ) : (
        <ul className="space-y-1 text-xs">
          {validationWarnings.map((warning) => (
            <li
              key={warning.id}
              className={warning.level === 'error' ? 'text-rose-700' : 'text-amber-700'}
            >
              {warning.level === 'error' ? 'Error:' : 'Warn:'} {warning.message}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  </aside>
  )
}
