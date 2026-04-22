import type { ChangeEventHandler, ReactNode } from 'react'

type Props = {
  label: string
  value: string
  onChange: ChangeEventHandler<HTMLInputElement | HTMLTextAreaElement>
  placeholder?: string
  textarea?: boolean
  rows?: number
  suffix?: ReactNode
}

export const InputField = ({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  rows = 3,
  suffix,
}: Props) => (
  <label className="flex flex-col gap-1">
    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    {textarea ? (
      <textarea
        value={value}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
      />
    ) : (
      <div className="relative">
        <input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none ring-0 transition placeholder:text-slate-400 focus:border-slate-500"
        />
        {suffix ? <div className="absolute inset-y-0 right-2 flex items-center">{suffix}</div> : null}
      </div>
    )}
  </label>
)
