import { useMemo } from 'react'

import type { ValidationWarning } from '@/features/validation/examValidation'
import { Button } from '@/components/ui/Button'
import type { ExportMode } from '@/types/exam'

type Props = {
  open: boolean
  mode: 'pdf' | 'docx' | null
  exportMode: ExportMode | null
  warnings: ValidationWarning[]
  onClose: () => void
  onProceed: () => void
  onJumpToFix: (warning: ValidationWarning) => void
}

const exportLabel = (mode: 'pdf' | 'docx' | null, exportMode: ExportMode | null) => {
  const formatLabel = mode === 'pdf' ? 'PDF' : mode === 'docx' ? 'DOCX' : 'file'

  if (!exportMode) {
    return formatLabel
  }

  if (exportMode === 'student') {
    return `${formatLabel} (Student Copy)`
  }

  if (exportMode === 'instructor') {
    return `${formatLabel} (Instructor Copy)`
  }

  return `${formatLabel} (Answer Key)`
}

export const ValidationModal = ({
  open,
  mode,
  exportMode,
  warnings,
  onClose,
  onProceed,
  onJumpToFix,
}: Props) => {
  const hasBlockingErrors = useMemo(
    () => warnings.some((warning) => warning.level === 'error'),
    [warnings],
  )

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" role="dialog" aria-modal aria-labelledby="validation-modal-title">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-4 shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="validation-modal-title" className="text-lg font-semibold text-slate-900">
              Validate Before Export
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {warnings.length === 0
                ? `No issues found. Ready to export ${exportLabel(mode, exportMode)}.`
                : `Found ${warnings.length} issue(s). Fix now or continue when safe.`}
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
          {warnings.length === 0 ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Validation passed.
            </div>
          ) : (
            warnings.map((warning) => (
              <div
                key={warning.id}
                className={`flex items-start justify-between gap-3 rounded-md border p-3 ${
                  warning.level === 'error'
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-amber-200 bg-amber-50'
                }`}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                    {warning.level === 'error' ? 'Blocking Error' : 'Warning'}
                  </p>
                  <p className="mt-1 text-sm text-slate-800">{warning.message}</p>
                </div>
                <Button
                  variant="secondary"
                  className="whitespace-nowrap"
                  onClick={() => onJumpToFix(warning)}
                >
                  Jump to fix
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onProceed} disabled={hasBlockingErrors}>
            Export {exportLabel(mode, exportMode)}
          </Button>
        </div>
      </div>
    </div>
  )
}
