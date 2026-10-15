# Gate 4 — Survival: state map and kill-test program

Status: groundwork + first probe campaign (results in §5).
Subject under test: the built app bundle (published 0.9.0 extracted copy; replaced
by each new release). Map verified against the tree at `cf3575a`.

The gate demand, restated honestly: **100× `kill -9` mid-autosave ⇒ zero loss;
disk-full + locked-file handled; schema-versioned project format; a future
re-export hash-matches.** This document pins what each clause means in this
codebase and how it gets proven by machines, not by reading code.

## 1. Where project state lives today

| Surface | Code | Notes |
| --- | --- | --- |
| Autosave draft | `src/App.tsx:196-202, 247-290`, `src/features/project/autosaveStorage.ts` | Debounced `AUTOSAVE_DELAY_MS = 1400` (`App.tsx:43`) after `isDirty` while on the editor screen. Write order: **localStorage → IndexedDB → slim localStorage** (images stripped). Restore on boot (`App.tsx:225-245`), status reads "Recovered unsaved draft." |
| Manual save | `src/lib/file-system/projectFile.ts`, `App.tsx:388-430` | `showSaveFilePicker` is **Chromium-only**; on the macOS WKWebView it does not exist, so `saveAs` falls through to `downloadProject` — an anchor download. Where that lands in the shipped app is **unpinned** (first-run item). |
| Manual open | `App.tsx:292-386` | Same API story: falls back to `<input type="file">` (native panel works in WKWebView). `.docx` import additionally goes through the Rust command below. |
| Rust fs | `src-tauri/src/lib.rs:10`, `src-tauri/src/fs/mod.rs` | **Import-only.** One command: `import_docx_template`. No project writes, no save path, no dialog/fs plugins (`Cargo.toml`, `capabilities/`). |
| Format versioning | `src/lib/validation/examSchema.ts:60-132` | `version` exists but is hardcoded `1` by every creator (templates, DOCX import); no `schemaVersion`, no migration, no fossil corpus. Parse = zod `safeParse`; an unparseable autosave is **silently cleared** (`autosaveStorage.ts:46-52`). |

Storage substrate on macOS (pinned 2026-10-15): origin is `tauri://localhost`;
state lives under
`~/Library/WebKit/com.papermint.exam-builder/WebsiteData/Default/<H1>/<H2>/`
as `LocalStorage/localstorage.sqlite3` (+ `-wal`, `-shm`) and
`IndexedDB/<db-hash>/IndexedDB.sqlite3`. State observed before any writes:
main sqlite file absent, 0-byte WAL, 32 KB SHM.

## 2. Gaps this gate must close

1. **No atomic-write discipline on any file path.** No temp+fsync+rename
   anywhere; the download fallback's behavior on failure is unknown.
2. **No explicit schema version.** `version` is a content counter, not a format
   marker; nothing distinguishes "old file" from "newer-than-me file".
3. **Disk-full and locked-file have no designated code path** and therefore no
   test target today. The test program below either finds one or the gate
   forces the smallest honest fix.
4. **Export byte-determinism is unmeasured** (`jspdf`/`docx` pipelines embed
   timestamps/UUIDs by default).
5. **The acknowledged-save promise is untested.** The status line says
   "Autosaved…" — nothing today proves that promise survives `SIGKILL` one
   millisecond later.

## 3. What "zero loss" means, precisely

Three invariants, each independently testable:

- **I1 — acknowledged-save invariant.** If the app has displayed an
  "Autosaved…" / "Saved…" status, a `kill -9` immediately afterward must leave
  a restorable state that contains exactly that state. (Kill within ms of the
  status appearing.)
- **I2 — bounded window.** For a kill at an arbitrary moment, the recovered
  draft must equal the **last completed autosave write**; at most one debounce
  window (1.4 s) of trailing edits may be in flight. No corruption, no phantom
  saves — the app must never restore a state claiming to include edits it
  didn't persist.
- **I3 — no corruption.** After any kill, the draft either parses under the
  schema or is handled by a *proven* path (adjudicated clear + honest status),
  never a crash-loop, never silent total loss.

100 iterations minimum, mixed modes: (a) I1 kills, (b) random-timing kills,
(c) forced-fallback runs (localStorage quota exceeded → IndexedDB / slim path).

## 4. The test program

Two layers, in order:

- **Layer 1 — platform probe** (`tools/survival/wk-probe`): a minimal WKWebView
  host whose only job is `localStorage.setItem` in a tight loop. Every
  completed write is acknowledged by an `F_FULLFSYNC`'ed log line (the durable
  witness — the analogue of the app's "Autosaved…" status, which is also set
  only after `setItem` returns). The host is `kill -9`'d at random moments,
  relaunched in report mode, and the invariant is checked: **recovered seq >=
  max acked seq**. This isolates the platform question without touching any
  product code.
- **Layer 2 — real-app confirmation** (after Layer 1): driver is **AppleScript
  System Events UI scripting** — probed working on this host (AX read + click +
  keystroke). Drives the real bundle; no dev-only hooks, no product changes.

- **Harness shape (per iteration).** Launch app → start a project → click the
  first editable header field → type marker `KILL-<n>-<rand>` → poll AX for the
  status string ("Autosaved to local draft." etc.) → `kill -9 $(pid)` at the
  chosen moment → relaunch → verify: (i) AX shows "Recovered unsaved draft."
  and the field contains the marker; (ii) on-disk WKWebView storage contains
  the marker (pinned path); (iii) a SQLite integrity check on the storage file.
- **Kill modes.** `I1` (kill ≤50 ms after status), `random` (uniform 0–5 s
  after the last keystroke), `fallback` (quota-filled localStorage to force
  IndexedDB / slim writes before the kill).
- **Disk-full (track 2).** Small RAM disk volume; target is whatever the Save
  path actually writes to (pinned in the first run). Until a file path exists
  in the app, the storage-quota path (`autosaveStorage.test.ts:82` pattern)
  stands in, and the absence of a file path is itself the finding.
- **Locked file (track 3).** `chflags uchg` on the save target (or the whole
  test volume); requirement: original intact, truthful error surfaced, no
  partial/garbage file left behind.
- **Schema fossils (track 4).** Hand-built project files: the `version: 1`
  shape; an unknown-newer shape; missing-field shapes. Requirement: open, or
  refuse clearly. Then the decision: introduce a real `schemaVersion` (the
  smallest honest fix) with a migration table and one archived fixture per
  released format.
- **Determinism (track 5).** Same input, 30 exports, compare sha256 per
  format (DOCX, PDF). Then the "future" clause: re-export under a pinned fake
  clock must reproduce the same hash — forces date/UUID normalization.

## 5. Findings log (chronological)

- **2026-10-15, map.** `showSaveFilePicker` is absent on WKWebView → Save falls
  through to the anchor download; where it lands is unpinned (needs one run
  with the real app). No Rust write path exists at all.
- **2026-10-15, AX probe.** System Events UI scripting works against the real
  bundle (window read, button click, keystroke all proven). Home screen
  exposes named buttons ("New Exam", "Shaqlawa Linux GUI", "Shaqlawa Blank",
  "Open Project", "Check for updates"). The editor exposes section fields and
  the live save indicator ("Autosave: local draft", "Saved / Not saved yet"),
  plus status texts ("Started new exam project.", "Autosaved to …").
- **2026-10-15, Layer 1 probe (tools/survival/wk-probe).** WKWebView host
  hammering `localStorage.setItem`; `kill -9` at random moments; invariant
  `recovered seq >= max acked seq`.
  - 3-cycle validation: **PASS** — recovered `seq` equaled the last acked
    write exactly (`seq == ACKMAX`), ~150-200 writes/s at 8 KB payload.
  - 100-cycle campaign (8 KB, 2-12 s random kill times): RESULTS PENDING.

## 6. Open questions

- None for the user beyond what's already on the intake list (oldest supported
  laptop arrives with raw material). The program runs without it.
