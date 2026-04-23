import { useEffect, useMemo, useRef, useState } from 'react'

import {
  useExamStore,
} from '@/app/store/examStore'
import { EditorWorkspace } from '@/components/layout/EditorWorkspace'
import { HomeScreen } from '@/components/layout/HomeScreen'
import { TopBar } from '@/components/layout/TopBar'
import { ValidationModal } from '@/components/dialogs/ValidationModal'
import {
  downloadBlob,
  downloadProject,
  fileToDataUrl,
  pickSaveHandle,
  readProjectFile,
  saveProjectToHandle,
} from '@/lib/file-system/projectFile'
import { exportExamDocx } from '@/lib/docx/exportDocx'
import {
  importDocxTemplateProject,
  isDocxFile,
} from '@/lib/docx/importDocxTemplate'
import { buildExamPdf, exportExamPdf } from '@/lib/pdf/exportPdf'
import {
  clearAutosaveProjectWithFallback,
  readAutosaveProjectWithFallback,
  writeAutosaveProjectWithFallback,
} from '@/features/project/autosaveStorage'
import {
  buildExamWarnings,
  computePaperMarks,
  computeSectionMarks,
  type ValidationWarning,
} from '@/features/validation/examValidation'
import type { ExportMode } from '@/types/exam'

const saveFileNameForProject = (fileName: string) =>
  fileName.endsWith('.exam.json') ? fileName : `${fileName.replace(/\.json$/i, '')}.exam.json`

const saveFileNameForImportedDocx = (fileName: string) =>
  saveFileNameForProject(fileName.replace(/\.docx$/i, '.exam.json'))

const AUTOSAVE_DELAY_MS = 1400

type PendingExport = {
  format: 'pdf' | 'docx'
  exportMode: ExportMode
}

const exportModeLabel = (mode: ExportMode) => {
  if (mode === 'instructor') {
    return 'instructor copy'
  }

  if (mode === 'answer_key') {
    return 'answer key'
  }

  return 'student copy'
}

const exportModeFileSegment = (mode: ExportMode) => {
  if (mode === 'instructor') {
    return 'instructor'
  }

  if (mode === 'answer_key') {
    return 'answer-key'
  }

  return 'student'
}

function App() {
  const {
    project,
    screen,
    revision,
    persistedRevision,
    lastSavedAt,
    selectedBlockId,
    projectFileName,
    saveHandle,
    questionBank,
    snippets,
    selectedSectionId,
    setScreen,
    startNewProject,
    startShaqlawaLinuxGuiProject,
    openProject,
    addTemplateField,
    updateTemplateField,
    removeTemplateField,
    replaceTemplateFields,
    applyTemplatePreset,
    addSection,
    updateSection,
    selectSection,
    duplicateSection,
    deleteSection,
    setTargetTotalMarks,
    setNumberingMode,
    saveBlockToBank,
    insertFromBank,
    saveSnippet,
    applySnippetToSectionInstructions,
    applySnippetToBlockPrompt,
    applySnippetToTemplateField,
    addBlock,
    addImageBlock,
    updateBlock,
    moveBlockByDirection,
    moveBlockByIndex,
    duplicateBlock,
    deleteBlock,
    selectBlock,
    attachImageAsset,
    setProjectFileName,
    setSaveHandle,
    markProjectPersisted,
  } = useExamStore()

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const didAttemptDraftRestore = useRef(false)

  const [insertDialogOpen, setInsertDialogOpen] = useState(false)
  const [insertIndex, setInsertIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [validationModalOpen, setValidationModalOpen] = useState(false)
  const [pendingExport, setPendingExport] = useState<PendingExport | null>(null)
  const [selectedExportMode, setSelectedExportMode] = useState<ExportMode>('student')
  const [highlightedTemplateFieldId, setHighlightedTemplateFieldId] = useState<string | null>(null)
  const [draftAutosaveSource, setDraftAutosaveSource] = useState<'local' | 'indexeddb' | 'local-slim'>('local')

  const canRenderEditor = useMemo(() => screen === 'editor', [screen])
  const isDirty = revision !== persistedRevision
  const autosaveTarget = useMemo(() => {
    if (saveHandle) {
      return 'file' as const
    }

    if (draftAutosaveSource === 'indexeddb') {
      return 'indexeddb' as const
    }

    return 'local' as const
  }, [draftAutosaveSource, saveHandle])

  const sectionTotals = useMemo(() => computeSectionMarks(project), [project])
  const paperTotalMarks = useMemo(() => computePaperMarks(project), [project])
  const validationWarnings = useMemo(() => buildExamWarnings(project), [project])
  const currentSection = useMemo(
    () => project.sections.find((section) => section.id === selectedSectionId) ?? project.sections[0],
    [project.sections, selectedSectionId],
  )
  const items = currentSection?.items ?? []
  const selectedBlock = useMemo(
    () => items.find((item) => item.id === selectedBlockId) ?? null,
    [items, selectedBlockId],
  )

  const sectionsForSidebar = useMemo(
    () =>
      project.sections.map((section) => {
        const total = sectionTotals.find((entry) => entry.sectionId === section.id)?.total ?? 0
        return {
          id: section.id,
          title: section.title,
          instructions: section.instructions,
          itemCount: section.items.length,
          totalMarks: total,
        }
      }),
    [project.sections, sectionTotals],
  )

  const selectedSectionIndex = useMemo(
    () => project.sections.findIndex((section) => section.id === currentSection?.id),
    [currentSection?.id, project.sections],
  )

  const questionNumberStart = useMemo(() => {
    if (project.settings?.numberingMode === 'per_section' || selectedSectionIndex <= 0) {
      return 1
    }

    return (
      project.sections
        .slice(0, selectedSectionIndex)
        .reduce((sum, section) => sum + section.items.length, 0) + 1
    )
  }, [project.sections, project.settings?.numberingMode, selectedSectionIndex])

  const cacheAutosaveDraft = async (draftProject: typeof project) => {
    const target = await writeAutosaveProjectWithFallback(window.localStorage, draftProject)
    setDraftAutosaveSource(
      target === 'indexed-db' ? 'indexeddb' : target === 'local-storage-slim' ? 'local-slim' : 'local',
    )
    return target
  }

  const startNew = () => {
    startNewProject()
    setDraftAutosaveSource('local')
    void clearAutosaveProjectWithFallback(window.localStorage)
    setStatus('Started new exam project.')
  }

  const startLinuxGuiTemplate = () => {
    startShaqlawaLinuxGuiProject()
    setDraftAutosaveSource('local')
    void clearAutosaveProjectWithFallback(window.localStorage)
    setStatus('Started Shaqlawa Linux (GUI) template project.')
  }

  useEffect(() => {
    if (didAttemptDraftRestore.current) {
      return
    }

    didAttemptDraftRestore.current = true
    void (async () => {
      const recovered = await readAutosaveProjectWithFallback(window.localStorage)
      if (!recovered.project) {
        return
      }

      if (recovered.source === 'indexed-db') {
        setDraftAutosaveSource('indexeddb')
      }

      openProject(recovered.project, 'autosave-draft.exam.json')
      markProjectPersisted(recovered.project.updatedAt)
      setStatus('Recovered unsaved draft.')
    })()
  }, [markProjectPersisted, openProject])

  useEffect(() => {
    if (screen !== 'editor' || !isDirty || busy) {
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      if (cancelled) {
        return
      }

      try {
        if (saveHandle) {
          await saveProjectToHandle(project, saveHandle)
          if (!cancelled) {
            markProjectPersisted()
            setStatus('Autosaved to project file.')
          }
          return
        }

        const target = await cacheAutosaveDraft(project)
        if (!cancelled) {
          markProjectPersisted()
          setStatus(
            target === 'indexed-db'
              ? 'Autosaved to IndexedDB draft.'
              : target === 'local-storage-slim'
                ? 'Autosaved locally (images omitted from draft).'
                : 'Autosaved to local draft.',
          )
        }
      } catch {
        if (!cancelled) {
          setStatus('Autosave failed. Please save manually.')
        }
      }
    }, AUTOSAVE_DELAY_MS)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [busy, isDirty, markProjectPersisted, project, saveHandle, screen])

  const handleNativeOpen = async () => {
    const win = window as Window & {
      showOpenFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle[]>
    }

    if (!win.showOpenFilePicker) {
      fileInputRef.current?.click()
      return
    }

    try {
      const [handle] = await win.showOpenFilePicker({
        excludeAcceptAllOption: false,
        multiple: false,
        types: [
          {
            description: 'Exam Project JSON',
            accept: {
              'application/json': ['.exam.json', '.json'],
            },
          },
          {
            description: 'Word Template (DOCX)',
            accept: {
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                ['.docx'],
            },
          },
        ],
      })
      const file = await handle.getFile()

      if (isDocxFile(file)) {
        const imported = await importDocxTemplateProject(file)
        const importedName = saveFileNameForImportedDocx(file.name)

        openProject(imported.project, importedName)
        setSaveHandle(null)
        setProjectFileName(importedName)
        markProjectPersisted(imported.project.updatedAt)
        await cacheAutosaveDraft(imported.project)
        setStatus(
          imported.warnings.length > 0
            ? `Imported ${file.name} with ${imported.warnings.length} warning(s).`
            : `Imported ${file.name} successfully.`,
        )
        return
      }

      const loaded = await readProjectFile(file)
      openProject(loaded, file.name)
      setSaveHandle({ kind: 'file-system-access', handle })
      markProjectPersisted()
      await cacheAutosaveDraft(loaded)
      setStatus(`Opened ${file.name}`)
    } catch {
      setStatus('Open canceled.')
    }
  }

  const onOpenFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      if (isDocxFile(file)) {
        const imported = await importDocxTemplateProject(file)
        const importedName = saveFileNameForImportedDocx(file.name)

        openProject(imported.project, importedName)
        setSaveHandle(null)
        setProjectFileName(importedName)
        markProjectPersisted(imported.project.updatedAt)
        await cacheAutosaveDraft(imported.project)
        setStatus(
          imported.warnings.length > 0
            ? `Imported ${file.name} with ${imported.warnings.length} warning(s).`
            : `Imported ${file.name} successfully.`,
        )
        return
      }

      const loaded = await readProjectFile(file)
      openProject(loaded, file.name)
      markProjectPersisted()
      await cacheAutosaveDraft(loaded)
      setStatus(`Opened ${file.name}`)
    } catch (error) {
      setStatus((error as Error).message)
    } finally {
      event.target.value = ''
    }
  }

  const saveAs = async () => {
    setBusy(true)
    try {
      const handle = await pickSaveHandle()
      if (handle) {
        await saveProjectToHandle(project, handle)
        setSaveHandle(handle)
        setProjectFileName(handle.handle.name ?? 'exam-project.exam.json')
        markProjectPersisted()
        await cacheAutosaveDraft(project)
        setStatus('Saved project file.')
        return
      }

      const fileName = saveFileNameForProject(projectFileName)
      downloadProject(project, fileName)
      setProjectFileName(fileName)
      markProjectPersisted()
      await cacheAutosaveDraft(project)
      setStatus(`Downloaded ${fileName}`)
    } catch {
      setStatus('Save canceled.')
    } finally {
      setBusy(false)
    }
  }

  const save = async () => {
    if (!saveHandle) {
      await saveAs()
      return
    }

    setBusy(true)
    try {
      await saveProjectToHandle(project, saveHandle)
      markProjectPersisted()
      await cacheAutosaveDraft(project)
      setStatus('Saved project file.')
    } finally {
      setBusy(false)
    }
  }

  const previewPdf = async () => {
    const previewWindow = window.open('', '_blank')
    if (previewWindow) {
      previewWindow.document.title = 'Preparing PDF preview...'
      previewWindow.document.body.innerHTML =
        '<p style="font-family: sans-serif; padding: 16px;">Preparing PDF preview...</p>'
    }

    setBusy(true)
    try {
      const blob = await buildExamPdf(project)
      const url = URL.createObjectURL(blob)

      if (!previewWindow) {
        downloadBlob(blob, 'exam-paper-preview.pdf')
        setStatus('Popup blocked. Downloaded PDF preview instead.')
      } else {
        previewWindow.location.href = url
        setStatus('Opened PDF preview.')
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      previewWindow?.close()
      setStatus('PDF preview failed.')
    } finally {
      setBusy(false)
    }
  }

  const runPdfExport = async (mode: ExportMode) => {
    setBusy(true)
    try {
      const suffix = exportModeFileSegment(mode)
      await exportExamPdf(project, `exam-paper.${suffix}.pdf`, mode)
      setStatus(`Exported PDF ${exportModeLabel(mode)} successfully.`)
    } catch {
      setStatus('PDF export failed.')
    } finally {
      setBusy(false)
    }
  }

  const runDocxExport = async (mode: ExportMode) => {
    setBusy(true)
    try {
      const suffix = exportModeFileSegment(mode)
      await exportExamDocx(project, `exam-paper.${suffix}.docx`, mode)
      setStatus(`Exported DOCX ${exportModeLabel(mode)} successfully.`)
    } catch {
      setStatus('DOCX export failed.')
    } finally {
      setBusy(false)
    }
  }

  const requestExport = (mode: 'pdf' | 'docx') => {
    setHighlightedTemplateFieldId(null)
    setPendingExport({
      format: mode,
      exportMode: selectedExportMode,
    })
    setValidationModalOpen(true)
  }

  const proceedValidatedExport = async () => {
    if (!pendingExport) {
      return
    }

    const requestedExport = pendingExport
    setValidationModalOpen(false)
    setPendingExport(null)

    if (requestedExport.format === 'pdf') {
      await runPdfExport(requestedExport.exportMode)
      return
    }

    await runDocxExport(requestedExport.exportMode)
  }

  const jumpToWarning = (warning: ValidationWarning) => {
    const target = warning.target
    if (!target) {
      return
    }

    if (target.kind === 'block') {
      selectSection(target.sectionId)
      selectBlock(target.blockId)
      setHighlightedTemplateFieldId(null)
      setValidationModalOpen(false)
      setStatus('Jumped to question needing attention.')
      return
    }

    if (target.kind === 'section') {
      if (target.sectionId) {
        selectSection(target.sectionId)
      }
      setHighlightedTemplateFieldId(null)
      setValidationModalOpen(false)
      setStatus('Jumped to section needing attention.')
      return
    }

    if (target.kind === 'template_field') {
      setHighlightedTemplateFieldId(target.fieldId)
      setValidationModalOpen(false)
      setStatus('Template metadata field highlighted in left sidebar.')
      return
    }

    if (target.kind === 'marks') {
      setHighlightedTemplateFieldId(null)
      setValidationModalOpen(false)
      setStatus('Open Marks Engine panel in left sidebar and adjust totals.')
    }
  }

  if (!canRenderEditor) {
    return (
      <>
        <HomeScreen
          onNew={startNew}
          onNewLinuxGuiTemplate={startLinuxGuiTemplate}
          onOpen={() => void handleNativeOpen()}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.exam.json,.docx"
          className="hidden"
          onChange={(event) => void onOpenFileInput(event)}
        />
      </>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <TopBar
        onNew={startNew}
        onOpen={() => void handleNativeOpen()}
        onSave={() => void save()}
        onSaveAs={() => void saveAs()}
        onExportPdf={() => requestExport('pdf')}
        onExportDocx={() => requestExport('docx')}
        exportMode={selectedExportMode}
        onExportModeChange={setSelectedExportMode}
        isBusy={busy}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        autosaveTarget={autosaveTarget}
        statusMessage={status || 'Ready'}
      />

      <EditorWorkspace
        templateFields={project.templateFields}
        sections={sectionsForSidebar}
        selectedSectionId={currentSection?.id ?? ''}
        sectionTitle={currentSection?.title}
        sectionInstructions={currentSection?.instructions}
        questionNumberStart={questionNumberStart}
        targetTotalMarks={project.settings?.targetTotalMarks}
        paperTotalMarks={paperTotalMarks}
        numberingMode={project.settings?.numberingMode ?? 'global'}
        templatePresetId={project.settings?.templatePresetId}
        validationWarnings={validationWarnings}
        highlightedTemplateFieldId={highlightedTemplateFieldId}
        questionBank={questionBank}
        snippets={snippets}
        items={items}
        assets={project.assets}
        selectedBlock={selectedBlock}
        selectedBlockId={selectedBlockId}
        dialogOpen={insertDialogOpen}
        insertionIndex={insertIndex}
        onTemplateFieldAdd={addTemplateField}
        onTemplateFieldUpdate={updateTemplateField}
        onTemplateFieldRemove={removeTemplateField}
        onReplaceTemplateFields={replaceTemplateFields}
        onApplyTemplatePreset={applyTemplatePreset}
        onAddSection={addSection}
        onSelectSection={selectSection}
        onUpdateSection={updateSection}
        onDuplicateSection={duplicateSection}
        onDeleteSection={deleteSection}
        onSetTargetTotalMarks={setTargetTotalMarks}
        onSetNumberingMode={setNumberingMode}
        onSaveBlockToBank={saveBlockToBank}
        onSaveSnippet={saveSnippet}
        onApplySnippetToSection={applySnippetToSectionInstructions}
        onApplySnippetToBlock={applySnippetToBlockPrompt}
        onApplySnippetToTemplateField={applySnippetToTemplateField}
        onSelectBlock={selectBlock}
        onRequestInsert={(index) => {
          setInsertDialogOpen(true)
          setInsertIndex(index)
        }}
        onCloseInsertDialog={() => setInsertDialogOpen(false)}
        onInsertType={(type, insertionIndex) => {
          addBlock(type, insertionIndex)
          setInsertDialogOpen(false)
        }}
        onInsertFromBank={(entryId, insertionIndex) => {
          insertFromBank(entryId, insertionIndex)
          setInsertDialogOpen(false)
        }}
        onPreviewPdf={() => void previewPdf()}
        onMoveUp={(blockId) => moveBlockByDirection(blockId, -1)}
        onMoveDown={(blockId) => moveBlockByDirection(blockId, 1)}
        onDuplicate={duplicateBlock}
        onDelete={(blockId) => {
          deleteBlock(blockId)
          setStatus('Question deleted.')
        }}
        onReorder={moveBlockByIndex}
        onUpdateBlock={updateBlock}
        onAttachImageFile={async (blockId, file) => {
          const dataUrl = await fileToDataUrl(file)
          attachImageAsset(blockId, dataUrl)
          setStatus(`Attached image: ${file.name}`)
        }}
        onCanvasDropImage={async (file, atIndex) => {
          const dataUrl = await fileToDataUrl(file)
          addImageBlock(dataUrl, atIndex ?? items.length)
          setStatus(`Added new image block: ${file.name}`)
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.exam.json,.docx"
        className="hidden"
        onChange={(event) => void onOpenFileInput(event)}
      />

      <button
        type="button"
        onClick={() => setScreen('home')}
        className="fixed bottom-3 right-3 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm hover:bg-slate-50"
      >
        Back to Home
      </button>

      <ValidationModal
        open={validationModalOpen}
        mode={pendingExport?.format ?? null}
        exportMode={pendingExport?.exportMode ?? null}
        warnings={validationWarnings}
        onClose={() => {
          setValidationModalOpen(false)
          setPendingExport(null)
        }}
        onProceed={() => void proceedValidatedExport()}
        onJumpToFix={jumpToWarning}
      />
    </div>
  )
}

export default App
