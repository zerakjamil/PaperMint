import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import type { ExportMode } from '@/types/exam'

type Props = {
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onExportPdf: () => void
  onExportDocx: () => void
  exportMode: ExportMode
  onExportModeChange: (mode: ExportMode) => void
  isBusy?: boolean
  isDirty: boolean
  lastSavedAt: string | null
  autosaveTarget: 'file' | 'local' | 'indexeddb'
  statusMessage?: string
}

const formatSavedAt = (value: string | null) => {
  if (!value) {
    return 'Not saved yet'
  }

  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export const TopBar = ({
  onNew,
  onOpen,
  onSave,
  onSaveAs,
  onExportPdf,
  onExportDocx,
  exportMode,
  onExportModeChange,
  isBusy,
  isDirty,
  lastSavedAt,
  autosaveTarget,
  statusMessage,
}: Props) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur relative">
      <div>
        <div className="flex items-center gap-4 mb-1">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-emerald-600 shadow-sm"
              onClick={() => setMenuOpen(!menuOpen)}
              title="Quick Menu"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.5 12C2.22386 12 2 11.7761 2 11.5C2 11.2239 2.22386 11 2.5 11H13.5C13.7761 11 14 11.2239 14 11.5C14 11.7761 13.7761 12 13.5 12H2.5ZM2.5 8.5C2.22386 8.5 2 8.27614 2 8C2 7.72386 2.22386 7.5 2.5 7.5H13.5C13.7761 7.5 14 7.72386 14 8C14 8.27614 13.7761 8.5 13.5 8.5H2.5ZM2 4.5C2 4.77614 2.22386 5 2.5 5H13.5C13.7761 5 14 4.77614 14 4.5C14 4.22386 13.7761 4 13.5 4H2.5C2.22386 4 2 4.22386 2 4.5Z" fill="currentColor"/>
              </svg>
            </button>

            {menuOpen ? (
              <div className="absolute left-0 top-full mt-1 w-48 rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50">
                <button type="button" onClick={() => { onNew(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-emerald-700">New Project</button>
                <button type="button" onClick={() => { onOpen(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-emerald-700">Open Project...</button>
                <div className="my-1 border-t border-slate-100"></div>
                <button type="button" onClick={() => { onSave(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-emerald-700">Save</button>
                <button type="button" onClick={() => { onSaveAs(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-emerald-700">Save As...</button>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <img src="/favicon.png" alt="PaperMint" className="h-6 w-6 object-contain" />
            <h1 className="text-lg font-bold tracking-widest text-emerald-600 uppercase">PAPERMINT</h1>
          </div>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs">
          <span
            className={`rounded-full px-2 py-0.5 font-medium ${
              isDirty ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {isDirty ? 'Unsaved changes' : `Saved ${formatSavedAt(lastSavedAt)}`}
          </span>
          <span className="text-slate-500">
            Autosave: {autosaveTarget === 'file' ? 'file' : autosaveTarget === 'indexeddb' ? 'IndexedDB draft' : 'local draft'}
          </span>
        </div>
        <p className="mt-1 max-w-[420px] truncate text-xs text-slate-600" aria-live="polite">
          {statusMessage ?? 'Ready'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600">
          Copy
          <select
            value={exportMode}
            onChange={(event) => onExportModeChange(event.target.value as ExportMode)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
            disabled={isBusy}
          >
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="answer_key">Answer key</option>
          </select>
        </label>
        <Button variant="secondary" onClick={onExportPdf} disabled={isBusy}>
          Export PDF
        </Button>
        <Button variant="secondary" onClick={onExportDocx} disabled={isBusy}>
          Export DOCX
        </Button>
      </div>
    </header>
  )
}
