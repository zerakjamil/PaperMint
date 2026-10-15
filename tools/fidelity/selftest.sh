#!/usr/bin/env bash
# Instrument self-test for renderediff.py.
#
# The harness's verdicts are only evidence if the instrument itself is proven:
#   invariance  — identical input must be a perfect match (SSIM 1.0, AE 0)
#   sensitivity — one appended paragraph must be caught (AE > 0, SSIM < 1)
#   pdf path    — PDF-to-PDF comparison works
#
# Hermetic: builds its own minimal DOCX pair; needs no corpus.
# Requires: soffice, pdftoppm, compare (ImageMagick), python3.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

python3 - "$work" <<'PYEOF'
import os
import sys
import zipfile

out = sys.argv[1]

CT = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''

RELS = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''


def document(body_extra: str = "") -> str:
    return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>PaperMint fidelity instrument self-test</w:t></w:r></w:p>
    <w:p><w:r><w:t>Second line of the test document.</w:t></w:r></w:p>
    {body_extra}
  </w:body>
</w:document>'''


def write_docx(path: str, body_extra: str = "") -> None:
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", CT)
        z.writestr("_rels/.rels", RELS)
        z.writestr("word/document.xml", document(body_extra))


write_docx(os.path.join(out, "minimal.docx"))
write_docx(
    os.path.join(out, "minimal-mod.docx"),
    '<w:p><w:r><w:t>INSERTED SENTENCE FOR SENSITIVITY SELF-TEST.</w:t></w:r></w:p>',
)
print("minimal docx pair written")
PYEOF

fail=0
check() { # name expected_exit actual_exit
  if [ "$3" -eq "$2" ]; then
    echo "PASS: $1 (exit $3)"
  else
    echo "FAIL: $1 (exit $3, expected $2)"
    fail=1
  fi
}

set +e
python3 "$here/renderediff.py" "$work/minimal.docx" "$work/minimal.docx" \
  --out "$work/self" >/dev/null 2>&1
check "invariance (identical => match)" 0 $?

python3 "$here/renderediff.py" "$work/minimal.docx" "$work/minimal-mod.docx" \
  --out "$work/mod" >/dev/null 2>&1
check "sensitivity (appended paragraph => differs)" 1 $?

soffice --headless -env:UserInstallation="file://$work/lo" \
  --convert-to pdf --outdir "$work" "$work/minimal.docx" >/dev/null 2>&1
python3 "$here/renderediff.py" "$work/minimal.pdf" "$work/minimal.pdf" \
  --out "$work/pdfself" >/dev/null 2>&1
check "pdf path (identical => match)" 0 $?
set -e

python3 - "$work/mod/report.json" <<'PYEOF2'
import json
import sys

rep = json.load(open(sys.argv[1]))
pages = rep["pages"]
ae = sum(p["ae_pixels"] for p in pages)
ssim_min = min(p["ssim"] for p in pages)
print(f"sensitivity report: pages={len(pages)} min_ssim={ssim_min:.6f} total_ae={ae}px")
assert rep["verdict"] == "differs", "modified document must differ"
assert ae > 0, "AE must catch the appended paragraph"
assert ssim_min < 1.0, "SSIM must drop below 1.0 on the modified page"
PYEOF2

if [ "$fail" -ne 0 ]; then
  echo "SELF-TEST FAILED"
  exit 1
fi
echo "SELF-TEST PASSED"
