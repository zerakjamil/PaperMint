# Fidelity harness (Gate 1)

`renderediff.py` renders two documents and compares them page by page.

- DOCX/DOC/ODT → rendered via LibreOffice headless (proxy; **Word stays the
  review oracle** — a CI verdict can be appealed in Word on Windows).
- PDF → compared as-is (e.g. the teacher's Word-exported PDF vs our export).
- Metric: per-page `SSIM` (structural similarity) plus `AE` (absolute-error
  pixel count) and a visual diff image per page.

Policy baseline: page counts equal; per page `SSIM >= 0.995`; `AE` must be 0
(SSIM alone hides small text edits — AE catches them). Thresholds get re-set
once a teacher-approved golden corpus exists. Every report embeds input
sha256s and tool versions so results stay reproducible.

Usage:

    python3 tools/fidelity/renderediff.py original.docx our-export.docx --out out/diff-1
    python3 tools/fidelity/renderediff.py teacher-approved.pdf our-export.pdf --out out/diff-2

The instrument itself is self-tested: identical documents must yield
SSIM = 1.0 / AE = 0 (invariance), and one appended paragraph must yield
AE > 0 (sensitivity). If it fails either, its verdicts are not evidence.
