# Release Process

How PaperMint is versioned, built, signed, and updated. For the April 2026 packaging baseline see `release-checklist.md`.

## Versioning

- Source of truth: `version` in `src-tauri/tauri.conf.json`. Keep `package.json` and `src-tauri/Cargo.toml` in sync.
- Beta line: `0.9.x`. The first i18n update ships as `0.9.1` to prove the auto-update channel before 1.0.0.

## Signing keys and secrets

- Updater signing uses a minisign keypair, independent of Apple code signing.
- Private key: `~/.tauri/papermint.key` (never committed). Keep a backup — if it is lost, already-installed apps cannot verify future updates, and users must install the next release manually.
- Public key: embedded in `src-tauri/tauri.conf.json` under `plugins.updater.pubkey`.
- GitHub repo secrets (already set):
  - `TAURI_SIGNING_PRIVATE_KEY` — contents of the private key file
  - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — empty (key generated without a password)
- Regenerate only as a last resort: `npm run tauri -- signer generate -w ~/.tauri/papermint.key`, then update the pubkey in `tauri.conf.json` and the secrets.

## Cutting a release

1. Bump the version in `src-tauri/tauri.conf.json`, `package.json`, `src-tauri/Cargo.toml`.
2. Commit on the release branch, push, merge to `main`.
3. Tag and push: `git tag v0.9.0 && git push origin v0.9.0` (or run the Release workflow manually via `workflow_dispatch`).
4. `.github/workflows/release.yml` builds the macOS app + DMG on `macos-latest`, signs updater artifacts, attaches `latest.json`, and creates a **draft** GitHub release.
5. Review the draft, then publish it. The updater endpoint is `releases/latest/download/latest.json`, which only serves **published** releases — drafts are invisible to the updater by design.
6. Install instructions for the unsigned beta (until notarization exists): download the DMG, drag to Applications, then first launch via right-click → Open → confirm.

## How updates work in the app

- Home screen → "Check for updates". Manual and opt-in; nothing touches the network otherwise.
- Flow: check → download + verify signature → install → relaunch (`@tauri-apps/plugin-updater` + `plugin-process`).
- Update checks fail harmlessly offline ("Couldn't check for updates.").

## When an Apple Developer account exists (later)

- Add notarization secrets (`APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`) and remove the right-click-open install note.
- The updater signature already covers update payloads; notarization only affects first-install trust.
