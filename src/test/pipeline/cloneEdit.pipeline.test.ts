import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { buildExamDocx } from '@/lib/docx/exportDocx'
import {
  mapDocxImportToProject,
  type DocxImportPayload,
} from '@/lib/docx/importDocxTemplate'
import { buildExamPdf } from '@/lib/pdf/exportPdf'

// Gate 1 "clone and edit" pipeline, stage 2 of tools/clone-edit/run.sh.
// Stage 1 is the Rust importer (cargo test dump_import_payload_fixture).
//
// This stage: payload JSON -> project -> change one field -> export DOCX+PDF,
// written to disk with a hash manifest, so a corpus run is reproducible and
// diffable by renderediff.py. Every product-side function here is the real
// shipping code; only the orchestration is new.
//
// Gated on env vars, so `npm test` and CI skip it silently:
//   PAPERMINT_CLONE_PAYLOAD     import payload JSON (Rust stage output)
//   PAPERMINT_CLONE_OUT         output directory
//   PAPERMINT_CLONE_EDIT_LABEL  template field label to change (default: first)
//   PAPERMINT_CLONE_EDIT_VALUE  new value for that field

const payloadPath = process.env.PAPERMINT_CLONE_PAYLOAD
const outDir = process.env.PAPERMINT_CLONE_OUT
const editLabel = process.env.PAPERMINT_CLONE_EDIT_LABEL
const editValue = process.env.PAPERMINT_CLONE_EDIT_VALUE ?? ''

const sha256 = (bytes: Uint8Array) =>
  createHash('sha256').update(bytes).digest('hex')

const blobToBytes = async (blob: Blob): Promise<Uint8Array> => {
  if (typeof blob.arrayBuffer === 'function') {
    return new Uint8Array(await blob.arrayBuffer())
  }
  const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(new Error('failed to read export blob'))
    reader.readAsArrayBuffer(blob)
  })
  return new Uint8Array(buffer)
}

const pipelineIt = payloadPath && outDir ? it : it.skip

describe('clone-and-edit pipeline', () => {
  pipelineIt(
    'import payload -> change one field -> export docx + pdf',
    async () => {
      if (!payloadPath || !outDir) {
        throw new Error('clone pipeline requires PAPERMINT_CLONE_PAYLOAD and PAPERMINT_CLONE_OUT')
      }

      const payload = JSON.parse(readFileSync(payloadPath, 'utf8')) as DocxImportPayload
      const { project, warnings } = mapDocxImportToProject(payload, 'clone.docx')

      const field = editLabel
        ? project.templateFields.find((entry) => entry.label === editLabel)
        : project.templateFields[0]

      if (!field) {
        throw new Error(`no template field matched (label=${editLabel ?? '<first>'})`)
      }

      field.value = editValue
      project.updatedAt = new Date().toISOString()

      mkdirSync(outDir, { recursive: true })

      const docxBytes = await blobToBytes(await buildExamDocx(project))
      writeFileSync(join(outDir, 'clone.docx'), docxBytes)

      const pdfBytes = await blobToBytes(await buildExamPdf(project))
      writeFileSync(join(outDir, 'clone.pdf'), pdfBytes)

      writeFileSync(join(outDir, 'clone.project.json'), JSON.stringify(project, null, 2))
      writeFileSync(
        join(outDir, 'manifest.json'),
        JSON.stringify(
          {
            sourceName: 'clone.docx',
            editedField: { label: field.label, value: editValue },
            templateFields: project.templateFields.length,
            sections: project.sections.length,
            questions: project.sections.reduce((sum, section) => sum + section.items.length, 0),
            warnings,
            hashes: {
              'clone.docx': sha256(docxBytes),
              'clone.pdf': sha256(pdfBytes),
            },
          },
          null,
          2,
        ),
      )
    },
    30_000,
  )
})
