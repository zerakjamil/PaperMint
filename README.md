# PaperMint Exam Builder (MVP)

PaperMint is an offline-first exam paper composer for university teachers. It provides structured question blocks, deterministic formatting, and export flows that reduce manual formatting work in Word.

## Stack

- Desktop shell: Tauri v2 (scaffolded)
- Frontend: React + TypeScript + Vite
- UI styling: Tailwind CSS v4
- State: Zustand
- Validation: Zod
- Drag and drop: dnd-kit
- PDF export: jsPDF
- DOCX export: docx

## Implemented MVP Features

- Home screen with New Exam and Open Project actions
- Three-panel editor workspace
- Header metadata editing for institutional template fields
- Dirty-state indicator with autosave status in the top bar
- Five question block types:
  - Essay
  - Multiple choice
  - True/False
  - Fill in the blank
  - Image question
- Insert question dialog at exact insertion points
- Drag reorder + move up/down
- Duplicate and delete question actions
- Live A4-style preview with basic pagination
- Local project open/save as JSON
- Autosave to chosen project file, with local-draft autosave fallback
- Image import via file picker, drag-and-drop, and clipboard paste
- Export to PDF and DOCX from the structured model with improved long-document pagination and large-image scaling
- Unit tests for core store behavior

## Project Layout

- src/: React app
- src-tauri/: Tauri shell
- docs/: architecture and export notes

## Run

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```

## Tauri Dev (requires Rust toolchain)

```bash
npm run tauri dev
```

## Tauri Build (App + DMG)

```bash
npm run tauri:build:dmg
```

## Notes

- Save/Open uses File System Access API when available, with download fallback.
- Tauri scripts run with CI mode to avoid Finder AppleScript failures in headless packaging environments.
- Export fidelity prioritizes clean academic output over visual parity with app chrome.
- Current Tauri shell is scaffolded and ready for native command expansion.
