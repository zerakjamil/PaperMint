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
}: Props) => (
  <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">PaperMint</p>
      <h1 className="text-lg font-semibold text-slate-900">Exam Builder MVP</h1>
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
      <Button variant="secondary" onClick={onNew} disabled={isBusy}>
        New
      </Button>
      <Button variant="secondary" onClick={onOpen} disabled={isBusy}>
        Open
      </Button>
      <Button variant="secondary" onClick={onSaveAs} disabled={isBusy}>
        Save As
      </Button>
      <Button variant="default" onClick={onSave} disabled={isBusy}>
        Save
      </Button>
      <Button variant="secondary" onClick={onExportPdf} disabled={isBusy}>
        Export PDF
      </Button>
      <Button variant="secondary" onClick={onExportDocx} disabled={isBusy}>
        Export DOCX
      </Button>
    </div>
  </header>
)
