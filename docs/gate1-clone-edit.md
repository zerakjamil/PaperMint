# Gate 1 — Clone and edit: pipeline and first findings

Status: pipeline built and proven on synthetic input; fidelity verdicts wait
for real papers (the calibration set).
Real-material acceptance procedure: §4. Nothing here is fidelity evidence yet;
the synthetic document only exists so the harness could be debugged before the
corpus arrives.

## 1. What "clone and edit" is

The golden path: a teacher opens **their own last exam** (a real `.docx`), changes
a field (date, course, a question), exports DOCX + PDF, and hands it to the
print shop — no retyping. The gate measures two things: the renders must be
indistinguishable from the teacher-approved originals, and the teacher must be
able to do it unaided in half the time Word takes them.

## 2. The pipeline (`tools/clone-edit/run.sh`)

Headless stages, all running the real shipping code — only the orchestration is
new:

1. **Rust import** (`cargo test dump_import_payload_fixture`, env-gated) —
   `import_docx_template_from_bytes` on the input `.docx` → `import-payload.json`.
2. **TS map + edit + export** (`src/test/pipeline/cloneEdit.pipeline.test.ts`,
   env-gated, skipped in CI) — `mapDocxImportToProject` → change one field
   (`PAPERMINT_CLONE_EDIT_LABEL` / `_VALUE`) → `buildExamDocx` + `buildExamPdf`
   → `clone.docx`, `clone.pdf`, `clone.project.json`, `manifest.json` (hashes).
3. **Renders + font audit** — LibreOffice headless render of `clone.docx`;
   `pdffonts` on `clone.pdf`.
4. **Optional diff** — `tools/fidelity/renderediff.py clone.pdf <word-twin.pdf>`
   (informational until twin pairs arrive; becomes a policy gate on the corpus).

Usage: `tools/clone-edit/run.sh <input.docx> <outDir> [word-twin.pdf]`
Synthetic input generator (plumbing only):
`node tools/clone-edit/make-synthetic-docx.mjs <out.docx>`

## 3. Findings from the first synthetic runs (2026-10-15)

- **Body import was broken for every DOCX** — found by this pipeline, fixed in
  `6270a4b`. `parse_part_blocks` walked only direct children of the XML root;
  in `word/document.xml` paragraphs live inside the `w:body` wrapper
  (`w:document > w:body > w:p`). Headers/footers worked because their parts
  have `w:p` directly under `w:hdr`/`w:ftr`. Effect: 0 body blocks → imported
  as a placeholder "Section A / Write your answer." — i.e. the clone path
  imported free of questions. After the fix: 10 body blocks → 5 parsed
  questions (essay, MCQ with 4 options, true/false, fill-blank, essay).
- **Marks are not structured.** "(5 marks)" stays inside the question prompt
  text; `marks` is never set. A cloned paper starts with zero structured
  marks — totals and marks algebra (Gate 2) read 0. Corpus question: what marks
  conventions do real papers use (numeric total, per-question notation,
  Kurdish terminology)?
- **Multi-token header lines collapse badly.** `Course: {{course_name}} Date:
  {{exam_date}} Duration: {{duration}}` maps to one field `Course =
  "Date: Duration:"` — tokens are stripped and the label-remnant becomes the
  editable value. Single-token `Label: {{token}}` lines map cleanly. Corpus
  question: which shapes do real teacher templates use? This decides whether
  the mapper needs per-token extraction.
- **Token detection rule (current).** `{{x}}`/`[x]`/`<<x>>`; a line that is
  exactly one token (or `Label: {{token}}` with nothing else) becomes an empty
  editable field named after the token; otherwise a whole-line `value_only`
  field. Real templates will be graded against this rule.
- **App PDF export embeds zero fonts.** `pdffonts` on `clone.pdf`: all
  standard-14 (`Helvetica`, `Courier`, `Times`, non-embedded). jsPDF cannot
  represent Kurdish (Arabic-script) text in this configuration at all; the
  DOCX path is fine (LibreOffice rendered `clone.docx` correctly). This is the
  known Gate 1 blocker for the PDF side of the channel; fixing it (embedded
  fonts / different PDF engine) is gate work, not a feature.
- **Not yet exercised against real files**: `w:sdt` content controls (the
  importer has an inert `"std"` arm and no `w:sdt` descent — if teacher
  templates use content controls, fields will be missed), header tables
  (surface exists via `parse_table`, unverified against real cells), RTL
  paragraph handling in headers (bidi attributes are not read).

## 4. Acceptance procedure when real material arrives

For each paper in `papers/` with a Word twin in `printed-twins/`:

1. `tools/clone-edit/run.sh <paper>.docx <out>/` with **no edit** (edit value
   equal to original field value) — this is the round-trip fidelity run.
2. `renderediff.py` verdict: per page SSIM ≥ 0.995 **and** AE == 0 against the
   Word twin (policy from the Gate 1 instrument; Word remains the review
   oracle when LibreOffice disagrees with the teacher's eyes).
3. `pdffonts` audit on `clone.pdf` — every used face embedded, no standard-14
   fallback for Kurdish text.
4. Re-export determinism: 30 runs, byte-identical outputs (Gate 4 track 5;
   date/UUID normalization will be needed — `mapDocxImportToProject` stamps
   `createdAt`/`updatedAt`, jsPDF stamps `CreationDate`).
5. Negative cases: errata/reprint papers with reasons — the clone must not
   reproduce the defect paths that got papers rejected.
6. Teacher usability (endgame): each teacher clones their own last exam,
   timed against their measured Word baseline, unaided; the print shop runs
   the result with zero correction rounds.

## 5. Open questions (feed the corpus review)

- Marks conventions in real papers (see above) — decides the extraction
  grammar for Gate 2 totals.
- Token/field shapes in real templates (see above).
- `w:sdt` content controls and header tables in real templates.
- Which fonts real header/footer text is set in, per teacher machine.
