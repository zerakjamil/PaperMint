import type { TemplateField } from '@/types/exam'

type Props = {
  fields: TemplateField[]
}

const findFieldValue = (fields: TemplateField[], key: string) => {
  return fields.find((f) => f.key === key)?.value ?? ''
}

export const ExamPageHeader = ({ fields }: Props) => {
  const topStripLeft = findFieldValue(fields, 'topStripLeft')
  const topStripRight = findFieldValue(fields, 'topStripRight')

  return (
    <div
      className="flex items-center justify-between border-[1.5px] border-slate-900 bg-white px-2 py-1 mb-4"
      dir="rtl"
    >
      <div className="text-sm font-bold">{topStripRight}</div>
      <div className="text-sm font-bold">{topStripLeft}</div>
    </div>
  )
}
