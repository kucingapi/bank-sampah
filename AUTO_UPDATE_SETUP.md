# Auto-Update Setup Guide

Your app now has built-in auto-update functionality! Users can check for and install updates directly from within the app — no need to manually download and install new versions.

## What Was Set Up

### ✅ Completed

1. **Rust Backend** — `tauri-plugin-updater` added and configured
2. **Signing Keys** — Generated for secure update verification
3. **GitHub Actions CI/CD** — Automated build and release workflow
4. **Frontend UI** — Update checker integrated into Settings page
5. **Auto-check on startup** — App checks for updates automatically

---

## 🔧 What You Need To Do

### Step 1: Update GitHub Repository URL

Open `src-tauri/tauri.conf.json` and replace `YOUR_GITHUB_USERNAME` with your actual GitHub username:

```json
"endpoints": [
  "https://github.com/YOUR_GITHUB_USERNAME/bank-sampah/releases/latest/download/latest.json"
]
```

### Step 2: Push Your Private Key to GitHub Secrets

Your private key was generated during setup. To retrieve it:

```bash
cd src-tauri
cat updater.key
```

Then:
1. Go to your GitHub repository
2. Navigate to **Settings → Secrets and variables → Actions**
3. Click **New repository secret**
4. Name: `TAURI_SIGNING_PRIVATE_KEY`
5. Value: Paste the contents of `updater.key`
6. Save

> ⚠️ **NEVER** commit your private key to the repository!

### Step 3: Push to GitHub

If you haven't already:

```bash
git add .
git commit -m "feat: add auto-update support"
git push origin main
```

### Step 4: Create Your First Release

To trigger the CI/CD pipeline, create a tag:

```bash
git tag v0.1.1
git push origin v0.1.1
```

This will:
1. Build your app for Windows, Linux (and optionally macOS)
2. Sign the binaries with your private key
3. Create a GitHub Release with the installers
4. Generate the `latest.json` manifest

### Step 5: Test the Update

1. Install the app from your first release
2. Create another tag (e.g., `v0.1.2`) with some changes
3. Push the tag
4. Open the installed app → go to Settings
5. You should see "New version available" with a download button!

---

## How It Works

### User Experience

```
Settings Page
├── [Auto-checks on app startup]
├── Shows: "Checking for updates..."
├── If update found: "New version v0.1.2 available"
│   └── [Download & Install] button
├── During download: Progress bar (0-100%)
└── After install: "Update installed! Restarting..."
```

### CI/CD Pipeline

When you push a tag like `v0.1.1`:

1. **GitHub Actions** triggers the `publish.yml` workflow
2. **Builds** your app for all platforms (Windows, Linux, macOS)
3. **Signs** the installers with your private key
4. **Creates** a GitHub Release (as draft)
5. **Uploads** the signed installers + `latest.json`

### Update Check Flow

```
App starts
    ↓
Checks GitHub for latest.json
    ↓
Compares versions
    ↓
If newer → Shows update UI
    ↓
User clicks "Download & Install"
    ↓
Downloads and verifies signature
    ↓
Installs and restarts automatically
```

---

## Files Created/Modified

### New Files
- `.github/workflows/publish.yml` — Release CI/CD workflow
- `.github/workflows/build.yml` — PR/test build workflow
- `src/features/check-for-update/` — Update checker feature (FSD)
  - `lib/use-updater.ts` — React hook for update logic
  - `ui/CheckForUpdate.tsx` — Update checker UI component
  - `index.ts` — Barrel exports

### Modified Files
- `src-tauri/Cargo.toml` — Added `tauri-plugin-updater`
- `src-tauri/src/lib.rs` — Registered updater plugin
- `src-tauri/tauri.conf.json` — Added updater config + `createUpdaterArtifacts`
- `src/pages/settings/ui/SettingsPage.tsx` — Integrated update checker UI

---

## CI/CD Workflow Details

### `publish.yml` (Release)
- **Triggers:** On tag push (`v*`) or manual dispatch
- **Platforms:** Ubuntu 22.04, Windows (macOS commented out)
- **Actions:** Build → Sign → Create GitHub Release
- **Output:** Draft release with signed installers

### `build.yml` (Test)
- **Triggers:** On PR to main or manual dispatch
- **Purpose:** Verify builds work without publishing
- **Output:** Build artifacts (no release created)

---

## Security Notes

- ✅ Updates are cryptographically signed
- ✅ Public key embedded in app verifies downloads
- ✅ Private key stored in GitHub Secrets (encrypted)
- ✅ Private key file (`updater.key`) is in `.gitignore`
- ❌ Never share or commit your private key

---

## Troubleshooting

### Update check fails with "404 Not Found"
- Check that the GitHub URL in `tauri.conf.json` is correct
- Ensure a release with `latest.json` exists

### "Invalid signature" error
- Verify the public key in `tauri.conf.json` matches your private key
- Check that the same keypair was used to sign the release

### CI/CD fails to build
- Check Rust dependencies: `cd src-tauri && cargo check`
- Check Node dependencies: `npm install`
- Review workflow logs in GitHub Actions

---

## Future Enhancements

- [ ] Add update notification badge in sidebar
- [ ] Schedule periodic update checks
- [ ] Show full changelog in update dialog
- [ ] Allow users to defer updates ("Remind me later")
- [ ] Add mandatory update enforcement for critical security patches
