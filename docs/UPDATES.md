# Flowtape updates

Flowtape uses Tauri's signed updater. Once a user installs the next updater-enabled release, future updates appear inside the app and install with one click. There is no need to send a new DMG manually for every feature release.

## One-time GitHub setup

Create these repository secrets under **GitHub → Settings → Secrets and variables → Actions**:

- `TAURI_SIGNING_PRIVATE_KEY`: the full contents of the private Flowtape updater key. Keep the original key backed up securely; losing it means future updates cannot be signed for existing installations.
- `APPLE_CERTIFICATE_BASE64`: base64 form of an exported `.p12` containing the **Developer ID Application** certificate and private key.
- `APPLE_CERTIFICATE_PASSWORD`: password chosen while exporting the `.p12`.
- `APPLE_KEYCHAIN_PASSWORD`: a new random password used only for the temporary GitHub Actions keychain.
- `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`: Apple notarization credentials. Use an app-specific Apple password for `APPLE_PASSWORD`, never the normal Apple ID password.

The updater key currently lives only on the build Mac at `/Users/sandroieva/.flowtape/keys/flowtape-updater.key`. Do not commit it, upload it to the repository, or share it in chat.

## Publish a release

1. Increase `version` in `src-tauri/tauri.conf.json` and the matching version in `src-tauri/Cargo.toml`.
2. Push the change to `main`.
3. On GitHub, open **Actions → Release Flowtape → Run workflow**.
4. Wait for the macOS and Windows jobs. They create a draft release containing the installers plus the signed updater files and `latest.json`.
5. Open **Releases**, check the draft, then publish it. The app will discover it automatically on next launch.

The first updater-enabled version still has to be installed manually. It becomes the bridge to all later in-app updates.

## Local release fallback

For a local build, set `TAURI_SIGNING_PRIVATE_KEY_PATH` to the private updater key path before running the Tauri release build. That produces the signed updater artifacts. Upload the resulting updater artifacts, their `.sig` files, and `latest.json` together with the DMG/Windows installer to one published GitHub release.
