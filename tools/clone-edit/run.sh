#!/bin/zsh
# Gate 1 clone-and-edit corpus pipeline (headless stages).
#
# Usage: tools/clone-edit/run.sh <input.docx> <outDir> [word-twin.pdf]
#
# Stages:
#   1. Rust importer  -> import-payload.json   (cargo test fixture dump)
#   2. TS mapping     -> clone.project.json, clone.docx, clone.pdf, manifest.json
#   3. Renders+audit  -> LibreOffice render of the clone, pdffonts audit
#   4. Optional       -> renderediff.py against a Word-twin PDF
#
# Every product-side stage is real shipping code; only the orchestration is
# new. Env knobs select the "change one field" move (default: first field):
#   PAPERMINT_CLONE_EDIT_LABEL / PAPERMINT_CLONE_EDIT_VALUE
#
# Note: stage 4 is informational while the edit differs from the twin on
# purpose; it becomes a policy gate once corpus twins arrive (run with the
# edited value equal to the original for an unedited round-trip).

set -u
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$DIR/../.." && pwd)"

if [ $# -lt 2 ]; then
  echo "usage: run.sh <input.docx> <outDir> [word-twin.pdf]" >&2
  exit 2
fi

DOCX="$1"
OUT="$2"
TWIN="${3:-}"

if [ ! -f "$DOCX" ]; then
  echo "input missing: $DOCX" >&2
  exit 2
fi

mkdir -p "$OUT"
DOCX_ABS="$(cd "$(dirname "$DOCX")" && pwd)/$(basename "$DOCX")"
OUT_ABS="$(cd "$OUT" && pwd)"

echo "[1/4] rust import -> payload"
(
  cd "$REPO/src-tauri" &&
    PAPERMINT_IMPORT_DOCX="$DOCX_ABS" cargo test -q dump_import_payload_fixture -- --nocapture
) > "$OUT_ABS/rust-test.log" 2>&1

if ! grep -q "<<<PAPERMINT_IMPORT_PAYLOAD_END>>>" "$OUT_ABS/rust-test.log"; then
  echo "rust import failed:" >&2
  tail -30 "$OUT_ABS/rust-test.log" >&2
  exit 1
fi
awk '/<<<PAPERMINT_IMPORT_PAYLOAD>>>/{flag=1;next}/<<<PAPERMINT_IMPORT_PAYLOAD_END>>>/{flag=0}flag' \
  "$OUT_ABS/rust-test.log" > "$OUT_ABS/import-payload.json"

echo "[2/4] map -> change one field -> export"
(
  cd "$REPO" &&
    PAPERMINT_CLONE_PAYLOAD="$OUT_ABS/import-payload.json" \
    PAPERMINT_CLONE_OUT="$OUT_ABS" \
    npx vitest run src/test/pipeline/cloneEdit.pipeline.test.ts
) > "$OUT_ABS/pipeline.log" 2>&1

if [ ! -f "$OUT_ABS/clone.docx" ] || [ ! -f "$OUT_ABS/clone.pdf" ]; then
  echo "pipeline failed:" >&2
  tail -40 "$OUT_ABS/pipeline.log" >&2
  exit 1
fi

echo "[3/4] renders + font audit"
if command -v soffice >/dev/null 2>&1; then
  mkdir -p "$OUT_ABS/renders"
  soffice --headless --convert-to pdf --outdir "$OUT_ABS/renders" "$OUT_ABS/clone.docx" \
    > "$OUT_ABS/renders/soffice.log" 2>&1 || true
fi
if command -v pdffonts >/dev/null 2>&1; then
  pdffonts "$OUT_ABS/clone.pdf" > "$OUT_ABS/fonts-app-pdf.txt" 2>&1 || true
fi

echo "[4/4] hashes"
( cd "$OUT_ABS" && shasum -a 256 import-payload.json clone.docx clone.pdf clone.project.json > sha256.txt ) || true

if [ -n "$TWIN" ]; then
  if [ -f "$TWIN" ]; then
    echo "diff vs word twin: $TWIN"
    python3 "$REPO/tools/fidelity/renderediff.py" "$OUT_ABS/clone.pdf" "$TWIN" \
      --out "$OUT_ABS/renderediff" || true
  else
    echo "twin not found: $TWIN" >&2
  fi
fi

echo "done -> $OUT_ABS"
