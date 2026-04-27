# Publishing Updates — Bank Sampah

## One-time Setup

1. **Install Wrangler CLI** (Cloudflare's deployment tool):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**:
   ```bash
   npx wrangler login
   ```

3. **Create the Pages project** at [Cloudflare Pages](https://dash.cloudflare.com/?to=/:account/pages):
   - Click "Create a project"
   - Choose "Direct Upload"
   - Name it: `bank-sampah-updates`

## Publishing a New Version

### Step 1: Update version in `src-tauri/tauri.conf.json`

```json
{
  "version": "0.1.2"
}
```

### Step 2: Build the app

```bash
npm run tauri:build
```

This produces updater artifacts in `src-tauri/target/release/bundle/`.

### Step 3: Deploy to Cloudflare Pages

```bash
npm run publish:update
```

Or manually:
```bash
.\scripts\publish-update.ps1
```

### Step 4: Verify

The `latest.json` file will be available at:
```
https://bank-sampah-updates.pages.dev/latest.json
```

Users will automatically see the update when they open the app.

## How It Works

1. `tauri build` creates:
   - Installer (`.exe` / `.msi`)
   - Signature file (`.sig`)
   - `latest.json` metadata file

2. The publish script copies these artifacts to a deploy folder and uploads to Cloudflare Pages

3. The Tauri updater checks `https://bank-sampah-updates.pages.dev/latest.json` for new versions

## Troubleshooting

### "No updater artifacts found"

Make sure `createUpdaterArtifacts` is set to `true` (or `"v1"`) in `tauri.conf.json`:
```json
{
  "bundle": {
    "createUpdaterArtifacts": true
  }
}
```

### "Failed to check for updates"

- Only works in production builds, not `tauri dev`
- Check that the URL in `tauri.conf.json` matches your Cloudflare Pages project
- Verify the project is deployed and publicly accessible

### Permission denied on Windows

Run PowerShell as Administrator or:
```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```
