import { useState, useRef, useEffect, useCallback } from 'react'

import { isImageSourceValue } from '@/lib/utils/exportLayout'
import type { TemplateField } from '@/types/exam'

type Props = {
  field: TemplateField
  onUpdate: (fieldId: string, value: string) => void
  imageMaxHeight?: string
  placeholder?: string
}

const buildSpanStyle = (field: TemplateField): React.CSSProperties => ({
  textAlign: field.style?.alignment,
  fontWeight: field.style?.bold ? 700 : undefined,
  fontStyle: field.style?.italics ? 'italic' : undefined,
  textDecoration: field.style?.underline ? 'underline' : undefined,
  fontSize: field.style?.fontSizePt ? `${field.style.fontSizePt}pt` : undefined,
  fontFamily: field.style?.fontFamily,
  color: field.style?.colorHex ? `#${field.style.colorHex}` : undefined,
})

const buildInputStyle = (field: TemplateField, textarea: boolean): React.CSSProperties => ({
  ...buildSpanStyle(field),
  width: '100%',
  resize: textarea ? 'vertical' : 'none',
  border: '2px solid #3b82f6',
  borderRadius: '4px',
  padding: '4px 6px',
  outline: 'none',
  background: '#fff',
  minHeight: textarea ? '2em' : undefined,
  lineHeight: '1.4',
  boxShadow: '0 0 0 3px rgba(59,130,246,0.15)',
})

export const InlineEditableField = ({
  field,
  onUpdate,
  imageMaxHeight = 'max-h-24',
  placeholder = 'Click to edit',
}: Props) => {
  const [editing, setEditing] = useState(false)
  const [localValue, setLocalValue] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  const startEditing = useCallback(() => {
    setLocalValue(field.value)
    setEditing(true)
  }, [field.value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  const commit = useCallback(() => {
    const trimmed = localValue.trim()
    if (trimmed !== field.value) {
      onUpdate(field.id, trimmed || field.value)
    }
    if (!trimmed) {
      setLocalValue(field.value)
    }
    setEditing(false)
  }, [localValue, field.value, field.id, onUpdate])

  const cancel = useCallback(() => {
    setEditing(false)
  }, [])

  const isImage = isImageSourceValue(field.value)
  const displayValue = field.value || placeholder
  const isMultiLine = (field.value || '').includes('\n') || field.value.length > 60

  if (isImage) {
    return (
      <figure className="flex flex-col items-center gap-1 rounded-md border border-slate-200 p-2">
        <img
          src={field.value}
          alt={field.label || 'Template image'}
          className={`w-auto max-w-full object-contain ${imageMaxHeight}`}
        />
        {field.label ? (
          <figcaption className="text-[11px] text-slate-500">{field.label}</figcaption>
        ) : null}
      </figure>
    )
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={startEditing}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            startEditing()
          }
        }}
        title={`Click to edit "${field.label || 'field'}"`}
        className="group relative inline-block max-w-full cursor-text rounded-sm px-1 py-0.5 transition-colors duration-100 hover:bg-sky-100 hover:ring-1 hover:ring-sky-300/60 focus:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-400"
        style={buildSpanStyle(field)}
      >
        <span className="whitespace-pre-wrap">{displayValue}</span>
        <span className="pointer-events-none absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-sky-500 text-[8px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
          ✎
        </span>
      </span>
    )
  }

  if (isMultiLine) {
    return (
      <textarea
        ref={inputRef as React.Ref<HTMLTextAreaElement>}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Escape') cancel()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
        }}
        rows={Math.max(1, (localValue.match(/\n/g) || []).length + 1)}
        style={buildInputStyle(field, true)}
        className="focus:outline-none"
      />
    )
  }

  return (
    <input
      ref={inputRef as React.Ref<HTMLInputElement>}
      type="text"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') cancel()
      }}
      style={buildInputStyle(field, false)}
      className="focus:outline-none"
    />
  )
}
