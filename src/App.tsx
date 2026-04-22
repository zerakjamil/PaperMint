import { useEffect, useMemo, useRef, useState } from 'react'

import {
  selectCurrentItems,
  selectIsDirty,
  selectSelectedBlock,
  useExamStore,
} from '@/app/store/examStore'
import { EditorWorkspace } from '@/components/layout/EditorWorkspace'
import { HomeScreen } from '@/components/layout/HomeScreen'
import { TopBar } from '@/components/layout/TopBar'
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

const saveFileNameForProject = (fileName: string) =>
  fileName.endsWith('.exam.json') ? fileName : `${fileName.replace(/\.json$/i, '')}.exam.json`

const saveFileNameForImportedDocx = (fileName: string) =>
  saveFileNameForProject(fileName.replace(/\.docx$/i, '.exam.json'))

const AUTOSAVE_DELAY_MS = 1400

function App() {
  const project = useExamStore((state) => state.project)
  const screen = useExamStore((state) => state.screen)
  const isDirty = useExamStore(selectIsDirty)
  const lastSavedAt = useExamStore((state) => state.lastSavedAt)
  const selectedBlockId = useExamStore((state) => state.selectedBlockId)
  const projectFileName = useExamStore((state) => state.projectFileName)
  const saveHandle = useExamStore((state) => state.saveHandle)
  const items = useExamStore(selectCurrentItems)
  const selectedBlock = useExamStore(selectSelectedBlock)

  const setScreen = useExamStore((state) => state.setScreen)
  const startNewProject = useExamStore((state) => state.startNewProject)
  const openProject = useExamStore((state) => state.openProject)
  const addTemplateField = useExamStore((state) => state.addTemplateField)
  const updateTemplateField = useExamStore((state) => state.updateTemplateField)
  const removeTemplateField = useExamStore((state) => state.removeTemplateField)
  const addBlock = useExamStore((state) => state.addBlock)
  const addImageBlock = useExamStore((state) => state.addImageBlock)
  const updateBlock = useExamStore((state) => state.updateBlock)
  const moveBlockByDirection = useExamStore((state) => state.moveBlockByDirection)
  const moveBlockByIndex = useExamStore((state) => state.moveBlockByIndex)
  const duplicateBlock = useExamStore((state) => state.duplicateBlock)
  const deleteBlock = useExamStore((state) => state.deleteBlock)
  const selectBlock = useExamStore((state) => state.selectBlock)
  const attachImageAsset = useExamStore((state) => state.attachImageAsset)
  const setProjectFileName = useExamStore((state) => state.setProjectFileName)
  const setSaveHandle = useExamStore((state) => state.setSaveHandle)
  const markProjectPersisted = useExamStore((state) => state.markProjectPersisted)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const didAttemptDraftRestore = useRef(false)

  const [insertDialogOpen, setInsertDialogOpen] = useState(false)
  const [insertIndex, setInsertIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [draftAutosaveSource, setDraftAutosaveSource] = useState<'local' | 'indexeddb' | 'local-slim'>('local')

  const canRenderEditor = useMemo(() => screen === 'editor', [screen])
  const autosaveTarget = useMemo(() => {
    if (saveHandle) {
      return 'file' as const
    }

    if (draftAutosaveSource === 'indexeddb') {
      return 'indexeddb' as const
    }

    return 'local' as const
  }, [draftAutosaveSource, saveHandle])

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

  const exportPdf = async () => {
    setBusy(true)
    try {
      await exportExamPdf(project, 'exam-paper.pdf')
      setStatus('Exported PDF successfully.')
    } catch {
      setStatus('PDF export failed.')
    } finally {
      setBusy(false)
    }
  }

  const exportDocx = async () => {
    setBusy(true)
    try {
      await exportExamDocx(project, 'exam-paper.docx')
      setStatus('Exported DOCX successfully.')
    } catch {
      setStatus('DOCX export failed.')
    } finally {
      setBusy(false)
    }
  }

  if (!canRenderEditor) {
    return (
      <>
        <HomeScreen onNew={startNew} onOpen={() => void handleNativeOpen()} />
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
        onExportPdf={() => void exportPdf()}
        onExportDocx={() => void exportDocx()}
        isBusy={busy}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        autosaveTarget={autosaveTarget}
        statusMessage={status || 'Ready'}
      />

      <EditorWorkspace
        templateFields={project.templateFields}
        items={items}
        assets={project.assets}
        selectedBlock={selectedBlock}
        selectedBlockId={selectedBlockId}
        dialogOpen={insertDialogOpen}
        insertionIndex={insertIndex}
        onTemplateFieldAdd={addTemplateField}
        onTemplateFieldUpdate={updateTemplateField}
        onTemplateFieldRemove={removeTemplateField}
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
    </div>
  )
}

export default App
