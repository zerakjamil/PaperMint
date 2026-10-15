#!/usr/bin/env python3
"""Render two documents and compare them visually, page by page (Gate 1 instrument).

Turns "looks the same" into per-page SSIM + absolute-error numbers.
DOCX/DOC/ODT inputs are rendered through LibreOffice headless — a proxy for
Word; Word remains the review oracle when a CI verdict needs an appeal.
PDF inputs are compared as-is.

Metric conventions (pinned by the instrument's own self-test):
- ``ssim``: index in [0, 1], 1 = identical. ImageMagick reports an SSIM
  *distortion* (identical => 0), so the index is ``1 - normalized distortion``.
- ``ae_pixels``: absolute count of differing pixels (0 = byte-level identical
  raster). SSIM alone hides small text edits — AE is the tripwire.

Usage:
    python3 tools/fidelity/renderediff.py A B --out DIR [--dpi 150] [--min-ssim 0.995]

Exit codes:
    0 = every page within policy   1 = visual difference found   2 = harness error
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile

RENDERABLE = {".docx", ".doc", ".odt"}
NUM_RE = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True)


def tool_version(*cmd: str) -> str:
    try:
        r = run(list(cmd))
    except FileNotFoundError:
        return "missing"
    first = (r.stdout or r.stderr).strip().splitlines()
    return first[0] if first else "unknown"


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def convert_to_pdf(path: str, outdir: str) -> str:
    profile = tempfile.mkdtemp(prefix="renderediff-lo-")
    try:
        r = run(
            [
                "soffice",
                "--headless",
                f"-env:UserInstallation=file://{profile}",
                "--convert-to",
                "pdf",
                "--outdir",
                outdir,
                path,
            ]
        )
        stem = os.path.splitext(os.path.basename(path))[0] + ".pdf"
        pdf = os.path.join(outdir, stem)
        if not os.path.exists(pdf):
            raise SystemExit(
                f"soffice produced no PDF for {path}\nstdout: {r.stdout}\nstderr: {r.stderr}"
            )
        return pdf
    finally:
        shutil.rmtree(profile, ignore_errors=True)


def to_pdf(path: str, workdir: str) -> str:
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":
        return path
    if ext in RENDERABLE:
        return convert_to_pdf(path, workdir)
    raise SystemExit(f"unsupported input for the harness: {path}")


def _page_number(path: str) -> int:
    m = re.search(r"(\d+)\.png$", path)
    return int(m.group(1)) if m else 0


def rasterize(pdf: str, outdir: str, dpi: int) -> list[str]:
    os.makedirs(outdir, exist_ok=True)
    r = run(["pdftoppm", "-png", "-r", str(dpi), pdf, os.path.join(outdir, "page")])
    pages = sorted(
        (os.path.join(outdir, f) for f in os.listdir(outdir) if f.endswith(".png")),
        key=_page_number,
    )
    if not pages:
        raise SystemExit(f"pdftoppm produced no pages for {pdf}\nstderr: {r.stderr}")
    return pages


def compare_numbers(a: str, b: str, metric: str) -> list[float]:
    """Numeric tokens from `compare -metric` output.

    ImageMagick 7 prints `absolute (normalized)`; older builds print one value.
    """
    r = run(["compare", "-metric", metric, a, b, "null:"])
    text = (r.stderr or r.stdout).strip()
    if "unable to open" in text or "missing an image" in text:
        raise SystemExit(f"compare failed: {text}")
    numbers = [float(m.group(0)) for m in NUM_RE.finditer(text)]
    if not numbers:
        raise SystemExit(f"cannot read {metric} metric from compare output: {text!r}")
    return numbers


def ssim_index(a: str, b: str) -> float:
    """SSIM index in [0, 1] (1 = identical), derived from ImageMagick's distortion."""
    numbers = compare_numbers(a, b, "SSIM")
    distortion = numbers[-1]
    if distortion > 1.0:  # defensive: a build that prints only the Q16 absolute value
        distortion /= 65535.0
    return max(0.0, min(1.0, 1.0 - distortion))


def ae_pixels(a: str, b: str) -> int:
    return int(compare_numbers(a, b, "AE")[0])


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("a", help="first document (docx/doc/odt/pdf) — e.g. the approved original")
    ap.add_argument("b", help="second document — e.g. our export")
    ap.add_argument("--out", required=True, help="directory for report + diff images")
    ap.add_argument("--dpi", type=int, default=150)
    ap.add_argument("--min-ssim", type=float, default=0.995)
    args = ap.parse_args()

    for path in (args.a, args.b):
        if not os.path.exists(path):
            print(f"harness error: no such file: {path}", file=sys.stderr)
            return 2

    os.makedirs(args.out, exist_ok=True)
    work = tempfile.mkdtemp(prefix="renderediff-work-")
    try:
        pdf_a = to_pdf(args.a, work)
        pdf_b = to_pdf(args.b, work)
        pages_a = rasterize(pdf_a, os.path.join(work, "a"), args.dpi)
        pages_b = rasterize(pdf_b, os.path.join(work, "b"), args.dpi)

        report: dict = {
            "a": {"path": os.path.abspath(args.a), "sha256": sha256(args.a)},
            "b": {"path": os.path.abspath(args.b), "sha256": sha256(args.b)},
            "dpi": args.dpi,
            "min_ssim": args.min_ssim,
            "metric_conventions": {
                "ssim": "index in [0,1], 1 = identical (1 - ImageMagick SSIM distortion)",
                "ae_pixels": "absolute count of differing pixels; 0 = identical raster",
            },
            "tools": {
                "soffice": tool_version("soffice", "--version"),
                "pdftoppm": tool_version("pdftoppm", "-v"),
                "compare": tool_version("compare", "-version"),
            },
            "page_count": {"a": len(pages_a), "b": len(pages_b)},
            "pages": [],
        }

        ok = len(pages_a) == len(pages_b)
        if len(pages_a) != len(pages_b):
            print(
                f"PAGE COUNT MISMATCH: {os.path.basename(args.a)} has {len(pages_a)}, "
                f"{os.path.basename(args.b)} has {len(pages_b)}"
            )

        for i, (pa, pb) in enumerate(zip(pages_a, pages_b), start=1):
            ssim = ssim_index(pa, pb)
            ae = ae_pixels(pa, pb)
            diff_png = os.path.join(args.out, f"diff-page-{i}.png")
            run(["compare", pa, pb, diff_png])
            page_ok = ssim >= args.min_ssim and ae == 0
            ok = ok and page_ok
            report["pages"].append(
                {
                    "page": i,
                    "ssim": ssim,
                    "ae_pixels": ae,
                    "within_policy": page_ok,
                    "diff_image": diff_png,
                }
            )
            print(f"page {i}: SSIM={ssim:.6f} AE={ae}px -> {'ok' if page_ok else 'DIFFERS'}")

        report["verdict"] = "match" if ok else "differs"
        with open(os.path.join(args.out, "report.json"), "w") as f:
            json.dump(report, f, indent=2)
            f.write("\n")
        print(f"verdict: {report['verdict']} (report: {os.path.join(args.out, 'report.json')})")
        return 0 if ok else 1
    finally:
        shutil.rmtree(work, ignore_errors=True)


if __name__ == "__main__":
    sys.exit(main())
