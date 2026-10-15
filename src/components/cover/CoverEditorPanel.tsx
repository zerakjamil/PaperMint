import type { TemplateField } from '@/types/exam'
import { CoverPagePreview } from '@/components/preview/CoverPagePreview'

type Props = {
  fields: TemplateField[]
  onUpdateField: (id: string, updates: Partial<Pick<TemplateField, 'value'>>) => void
}

export const CoverEditorPanel = ({ fields, onUpdateField }: Props) => {
  const handleUpdate = (key: string, value: string) => {
    const field = fields.find((f) => f.key === key)
    if (field) {
      onUpdateField(field.id, { value })
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="text-xs text-slate-500 mb-2">
        Click any text in the preview below to edit it inline.
      </div>
      <div className="relative w-full" style={{ paddingBottom: '141.4%' /* A4 Aspect Ratio */ }}>
        <div className="absolute inset-0 origin-top-left scale-[0.35] w-[210mm] h-[297mm]">
          <CoverPagePreview
            fields={fields}
            isEditable
            onUpdateField={handleUpdate}
          />
        </div>
      </div>
    </div>
  )
}
