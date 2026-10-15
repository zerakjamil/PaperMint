

import type { TemplateField } from '@/types/exam'
import { MarksTable } from './MarksTable'

type Props = {
  fields: TemplateField[]
  isEditable?: boolean
  onUpdateField?: (key: string, value: string) => void
}

const findField = (fields: TemplateField[], key: string) => fields.find((f) => f.key === key)

const findFieldValue = (fields: TemplateField[], key: string) => {
  return findField(fields, key)?.value ?? ''
}

const EditableField = ({
  fieldKey,
  fields,
  isEditable,
  onUpdateField,
  className = '',
  textarea = false,
  dir,
  placeholder,
}: {
  fieldKey: string
  fields: TemplateField[]
  isEditable?: boolean
  onUpdateField?: (key: string, value: string) => void
  className?: string
  textarea?: boolean
  dir?: string
  placeholder?: string
}) => {
  const field = findField(fields, fieldKey)
  const value = field?.value ?? ''

  if (!isEditable || !field) {
    return (
      <div className={className} dir={dir}>
        {value}
      </div>
    )
  }

  if (textarea) {
    return (
      <textarea
        className={`w-full resize-none border-b border-dashed border-slate-300 bg-transparent hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none ${className}`}
        value={value}
        onChange={(e) => onUpdateField?.(fieldKey, e.target.value)}
        dir={dir}
        placeholder={placeholder}
        rows={value.split('\n').length || 1}
      />
    )
  }

  return (
    <input
      type="text"
      className={`w-full border-b border-dashed border-slate-300 bg-transparent hover:bg-slate-50 focus:border-blue-500 focus:bg-white focus:outline-none ${className}`}
      value={value}
      onChange={(e) => onUpdateField?.(fieldKey, e.target.value)}
      dir={dir}
      placeholder={placeholder}
    />
  )
}

export const CoverPagePreview = ({ fields, isEditable, onUpdateField }: Props) => {
  const institutionLogoField = findField(fields, 'institutionLogo')
  const totalMarks = findFieldValue(fields, 'totalMarks') || '60'
  const questionCount = findFieldValue(fields, 'questionCount') || '6'

  return (
    <div
      className="mx-auto w-full max-w-[210mm] bg-white text-black print:m-0 print:h-[297mm] print:w-[210mm] print:shadow-none font-['Noto_Sans_Arabic',_sans-serif]"
      dir="rtl"
      id="cover-page-export"
    >
      <div className="h-full w-full border-[2px] border-slate-900 p-2">
        {/* Header Strip */}
        <div className="flex items-center justify-between border-[1.5px] border-slate-900 p-2 font-bold text-sm">
          <EditableField fieldKey="topStripRight" fields={fields} isEditable={isEditable} onUpdateField={onUpdateField} />
          <EditableField fieldKey="topStripLeft" fields={fields} isEditable={isEditable} onUpdateField={onUpdateField} />
        </div>

        {/* 3-Column Top Section */}
        <div className="mt-4 flex border-[1.5px] border-slate-900">
          {/* Right Column: Institution Info */}
          <div className="flex w-[40%] flex-col gap-3 p-3 border-l-[1.5px] border-slate-900">
            <EditableField
              fieldKey="institutionName"
              fields={fields}
              isEditable={isEditable}
              onUpdateField={onUpdateField}
              textarea
              className="whitespace-pre-wrap text-sm font-bold text-center"
            />
            <EditableField
              fieldKey="institutionNameEn"
              fields={fields}
              isEditable={isEditable}
              onUpdateField={onUpdateField}
              textarea
              dir="ltr"
              className="whitespace-pre-wrap text-sm font-bold text-center"
            />
            <EditableField
              fieldKey="courseMetadata"
              fields={fields}
              isEditable={isEditable}
              onUpdateField={onUpdateField}
              textarea
              className="whitespace-pre-wrap text-sm leading-relaxed mt-2"
            />
          </div>

          {/* Middle Column: Logo & Session */}
          <div className="flex w-[30%] flex-col items-center justify-center gap-3 p-3 border-l-[1.5px] border-slate-900 relative group">
            {institutionLogoField?.value ? (
              <img src={institutionLogoField.value} alt="Logo" className="h-20 w-20 object-contain" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-400">
                <span className="text-xs text-slate-400">Logo</span>
              </div>
            )}
            {isEditable && institutionLogoField && (
              <label className="absolute top-4 cursor-pointer rounded bg-white/90 px-2 py-1 text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity">
                Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    const reader = new FileReader()
                    reader.onload = () => onUpdateField?.('institutionLogo', String(reader.result))
                    reader.readAsDataURL(file)
                  }}
                />
              </label>
            )}
            <EditableField
              fieldKey="sessionBanner"
              fields={fields}
              isEditable={isEditable}
              onUpdateField={onUpdateField}
              textarea
              className="whitespace-pre-wrap text-center text-sm font-bold leading-relaxed"
            />
          </div>

          {/* Left Column: Student Detail Headers */}
          <div className="flex w-[30%] flex-col p-3">
            <EditableField
              fieldKey="coverLeftMetadata"
              fields={fields}
              isEditable={isEditable}
              onUpdateField={onUpdateField}
              textarea
              className="whitespace-pre-wrap text-sm font-bold leading-[2.5]"
            />
          </div>
        </div>

        {/* Student Serial Strip */}
        <div className="mt-4 flex border-[1.5px] border-slate-900">
          <EditableField
            fieldKey="studentSerialLabel"
            fields={fields}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
            textarea
            className="flex w-24 items-center justify-center border-l-[1.5px] border-slate-900 p-2 font-bold whitespace-pre-wrap text-center text-sm"
          />
          <div className="flex-1 p-2"></div>
        </div>

        {/* Marks Table */}
        <div className="mt-4">
          <MarksTable
            totalMarks={Number(totalMarks)}
            questionCount={Number(questionCount)}
          />
        </div>

        {/* Instructions */}
        <div className="mt-4 border-[1.5px] border-slate-900 p-4">
          <EditableField
            fieldKey="coverInstructions"
            fields={fields}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
            textarea
            className="whitespace-pre-wrap text-xs leading-relaxed"
          />
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between border-[1.5px] border-slate-900 p-3">
          <div className="flex-1"></div>
          <EditableField
            fieldKey="footerBlessing"
            fields={fields}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
            className="flex-1 text-center font-bold text-lg"
          />
          <EditableField
            fieldKey="lecturerSignature"
            fields={fields}
            isEditable={isEditable}
            onUpdateField={onUpdateField}
            textarea
            dir="ltr"
            className="flex-1 whitespace-pre-wrap text-left text-sm font-bold"
          />
        </div>
      </div>
    </div>
  )
}
