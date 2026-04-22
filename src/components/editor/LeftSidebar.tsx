import type { ChangeEvent } from 'react'

import type { TemplateField, QuestionBlock } from '@/types/exam'
import { InputField } from '@/components/ui/InputField'
import { Panel } from '@/components/ui/Panel'

type TemplateFieldUpdates = Partial<
  Pick<TemplateField, 'label' | 'value' | 'displayMode' | 'style'>
>

type Props = {
  templateFields: TemplateField[]
  items: QuestionBlock[]
  selectedBlockId: string | null
  onTemplateFieldAdd: (section: 'header' | 'footer') => void
  onTemplateFieldUpdate: (id: string, updates: TemplateFieldUpdates) => void
  onTemplateFieldRemove: (id: string) => void
  onSelectBlock: (blockId: string) => void
}

const blockTitle = (type: QuestionBlock['type']) => {
  if (type === 'essay') return 'Essay'
  if (type === 'mcq') return 'MCQ'
  if (type === 'true_false') return 'True/False'
  if (type === 'fill_blank') return 'Fill Blank'
  return 'Image'
}

const isImageTemplateValue = (value: string) => value.trim().startsWith('data:image/')

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
  onTemplateFieldUpdate: Props['onTemplateFieldUpdate']
  onTemplateFieldRemove: Props['onTemplateFieldRemove']
}

const TemplateFieldEditor = ({
  field,
  isFooter,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
}: TemplateFieldEditorProps) => {
  const isImage = isImageTemplateValue(field.value)
  const displayMode = field.displayMode ?? 'label_value'
  const style = field.style ?? {}

  return (
    <div className="relative space-y-2 rounded-md border border-slate-200 p-2">
      <button
        type="button"
        className="absolute right-2 top-2 text-[10px] text-red-500"
        onClick={() => onTemplateFieldRemove(field.id)}
      >
        remove
      </button>

      <input
        value={field.label}
        onChange={(e) => onTemplateFieldUpdate(field.id, { label: e.target.value })}
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
        />
      )}

      {!isImage ? (
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
          onChange={async (event) => {
            const dataUrl = await readTemplateImage(event)
            if (dataUrl) {
              onTemplateFieldUpdate(field.id, { value: dataUrl })
            }
          }}
        />
      </label>
    </div>
  )
}

export const LeftSidebar = ({
  templateFields,
  items,
  selectedBlockId,
  onTemplateFieldAdd,
  onTemplateFieldUpdate,
  onTemplateFieldRemove,
  onSelectBlock,
}: Props) => (
  <aside className="space-y-3 overflow-y-auto p-3">
    <Panel title="Template Fields (Header)">
      <div className="space-y-4">
        {templateFields
          .filter((f) => f.section === 'header')
          .map((field) => (
            <TemplateFieldEditor
              key={field.id}
              field={field}
              isFooter={false}
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
              onTemplateFieldUpdate={onTemplateFieldUpdate}
              onTemplateFieldRemove={onTemplateFieldRemove}
            />
          ))}
        <button type="button" onClick={() => onTemplateFieldAdd('footer')} className="text-xs text-blue-600 font-medium">+ Add Footer Field</button>
      </div>
    </Panel>

    <Panel title="Question Outline">
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
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
  </aside>
)
