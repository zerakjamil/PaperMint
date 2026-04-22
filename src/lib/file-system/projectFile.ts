import { examProjectSchema } from '@/lib/validation/examSchema'
import type { ExamProject } from '@/types/exam'

export type SaveHandle = {
  kind: 'file-system-access'
  handle: FileSystemFileHandle
}

const MIME = 'application/json;charset=utf-8'

const toBlob = (project: ExamProject) =>
  new Blob([JSON.stringify(project, null, 2)], { type: MIME })

export const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const downloadProject = (project: ExamProject, fileName: string) => {
  downloadBlob(toBlob(project), fileName)
}

export const parseProjectText = (value: string): ExamProject => {
  const parsed = JSON.parse(value)
  const validated = examProjectSchema.safeParse(parsed)

  if (!validated.success) {
    throw new Error('Invalid exam project file format.')
  }

  return validated.data
}

export const readProjectFile = async (file: File): Promise<ExamProject> => {
  const text = await file.text()
  return parseProjectText(text)
}

export const saveProjectToHandle = async (
  project: ExamProject,
  saveHandle: SaveHandle,
) => {
  const writable = await saveHandle.handle.createWritable()
  await writable.write(toBlob(project))
  await writable.close()
}

export const pickSaveHandle = async (): Promise<SaveHandle | null> => {
  const win = window as Window & {
    showSaveFilePicker?: (options?: unknown) => Promise<FileSystemFileHandle>
  }

  if (!win.showSaveFilePicker) {
    return null
  }

  const handle = await win.showSaveFilePicker({
    suggestedName: 'exam-project.exam.json',
    types: [
      {
        description: 'Exam Project JSON',
        accept: {
          'application/json': ['.exam.json', '.json'],
        },
      },
    ],
  })

  return { kind: 'file-system-access', handle }
}

export const fileToDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Unable to read image file.'))
    reader.readAsDataURL(file)
  })
