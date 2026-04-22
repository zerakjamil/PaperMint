# Release Checklist

Date: 2026-04-22
Pass type: Stabilization + regression coverage

## Scope Guard

- [x] No new product features added
- [x] Changes limited to reliability, regression coverage, packaging, and release docs

## Regression Coverage

- [x] Fixture-based autosave recovery tests
- [x] Fixture-based PDF export layout tests
- [x] Fixture-based DOCX export tests
- [x] Pagination stress fixture created
- [x] Large-image stress fixture created

## Build and Quality Gates

- [x] `npm run lint`
- [x] `npm run test`
- [x] `npm run build`

Evidence:

- lint: pass
- tests: 20 passed
- build: pass (non-blocking chunk-size warning)

## Packaging Verification (macOS)

- [x] `npm run tauri -- build --debug`
- [x] `npm run tauri:build:dmg`
- [x] `.app` artifact generated
- [x] `.dmg` artifact generated

Evidence:

- app: `src-tauri/target/release/bundle/macos/PaperMint.app`
- dmg: `src-tauri/target/release/bundle/dmg/PaperMint_0.1.0_aarch64.dmg`

## Export Verification from Fixtures

- [x] PDF export generated from pagination stress fixture (multi-page expected)
- [x] PDF oversized image fit validated against print bounds
- [x] DOCX export generated from pagination stress fixture
- [x] DOCX export generated from oversized image fixture

## Artifacts (expected locations)

- macOS app: `src-tauri/target/release/bundle/macos/PaperMint.app`
- DMG: `src-tauri/target/release/bundle/dmg/PaperMint_0.1.0_aarch64.dmg`
