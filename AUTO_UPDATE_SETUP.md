# Auto-Update Setup Guide

Your app now has built-in auto-update functionality! Users can check for and install updates directly from within the app — no need to manually download and install new versions.

## ✅ What's Already Done

1. **Rust Backend** — `tauri-plugin-updater` added and configured
2. **Signing Keys** — Generated and saved to GitHub Secrets
3. **GitHub Actions CI/CD** — Automated build and release workflow
4. **Frontend UI** — Update checker in Settings page (auto-checks on startup)
5. **v0.1.1 Release** — Published with all binaries + `latest.json`
6. **Update Endpoint** — Live at `https://github.com/kucingapi/bank-sampah/releases/latest/download/latest.json`

---

## 🔧 How to Release Updates

### Step 1: Bump the Version

Edit `src-tauri/tauri.conf.json`:
```json
"version": "0.1.2"  // Change to your new version
```

### Step 2: Commit and Tag

```bash
git add src-tauri/tauri.conf.json
git commit -m "chore: bump version to 0.1.2"
git tag v0.1.2
git push origin master --tags
```

### Step 3: Wait for GitHub Actions

The workflow will:
1. Build for **Linux** (.deb, .rpm, AppImage) and **Windows** (.msi, .exe)
2. Sign all binaries with your private key
3. Create a **draft** GitHub Release
4. Upload `latest.json` update manifest

### Step 4: Publish the Release

The workflow creates a draft. Publish it via GitHub UI or CLI:

**Option A: GitHub UI**
1. Go to your repo → Releases
2. Find the draft release
3. Click "Edit" → "Publish release"

**Option B: GitHub CLI**
```bash
# Get the release ID and publish
gh api repos/kucingapi/bank-sampah/releases --jq '.[0] | select(.draft == true) | .id' | \
  xargs -I{} gh api repos/kucingapi/bank-sampah/releases/{} -X PATCH -F draft=0
```

Once published, `latest.json` becomes available at:
```
https://github.com/kucingapi/bank-sampah/releases/latest/download/latest.json
```

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

### Release Workflow

When you push a tag like `v0.1.2`:

1. **GitHub Actions** triggers the `publish.yml` workflow
2. **Builds** your app for all platforms (Windows, Linux)
3. **Signs** the installers with your private key
4. **Creates** a draft GitHub Release
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

## Security Notes

- ✅ Updates are cryptographically signed
- ✅ Public key embedded in app verifies downloads
- ✅ Private key stored in GitHub Secrets (encrypted)
- ✅ Private key file (`updater.key`) is in `.gitignore`
- ❌ Never share or commit your private key

---

## Release Assets

Each release includes:

**Linux:**
- `bank-sampah_X.X.X_amd64.deb` — Debian/Ubuntu installer
- `bank-sampah-X.X.X-1.x86_64.rpm` — Fedora/RHEL installer
- `bank-sampah_X.X.X_amd64.AppImage` — Portable Linux binary

**Windows:**
- `bank-sampah_X.X.X_x64_en-US.msi` — MSI installer
- `bank-sampah_X.X.X_x64-setup.exe` — NSIS installer

**All platforms:**
- `latest.json` — Update manifest (required for auto-updates)
- `.sig` files — Signature files for verification

---

## Troubleshooting

### Update check fails with "404 Not Found"
- Check that the release is **published** (not draft)
- Verify the URL in `tauri.conf.json` matches your repo

### "Invalid signature" error
- Verify the public key in `tauri.conf.json` matches your private key
- Check that the same keypair was used to sign the release

### CI/CD fails to build
- Check Rust dependencies: `cd src-tauri && cargo check`
- Check Node dependencies: `npm install`
- Review workflow logs in GitHub Actions

### Release created but no assets
- Make sure `tagName` is set to `${{ github.ref_name }}` in the workflow
- Check that `createUpdaterArtifacts: true` is in `tauri.conf.json`

---

## Future Enhancements

- [ ] Add update notification badge in sidebar
- [ ] Schedule periodic update checks
- [ ] Show full changelog in update dialog
- [ ] Allow users to defer updates ("Remind me later")
- [ ] Add mandatory update enforcement for critical security patches
