# Publish updater artifacts to Cloudflare Pages
# Usage: .\scripts\publish-update.ps1

$ErrorActionPreference = "Stop"

$PROJECT_ROOT = Split-Path $PSScriptRoot -Parent
$BUNDLE_DIR = Join-Path $PROJECT_ROOT "src-tauri\target\release\bundle"
$DEPLOY_DIR = Join-Path $PROJECT_ROOT "update-artifacts"
$TAURI_CONF = Join-Path $PROJECT_ROOT "src-tauri\tauri.conf.json"

# Check if bundle exists
if (-not (Test-Path $BUNDLE_DIR)) {
    Write-Host "ERROR: No build artifacts found. Run 'npm run tauri:build' first." -ForegroundColor Red
    exit 1
}

# Create deploy directory
if (Test-Path $DEPLOY_DIR) {
    Remove-Item $DEPLOY_DIR -Recurse -Force
}
New-Item -ItemType Directory -Path $DEPLOY_DIR -Force | Out-Null

# Read version from tauri.conf.json
$CONF = Get-Content $TAURI_CONF | ConvertFrom-Json
$VERSION = $CONF.version
Write-Host "Version: $VERSION" -ForegroundColor Cyan

# Copy updater artifacts (Windows NSIS) — only latest version
$NSIS_DIR = Join-Path $BUNDLE_DIR "nsis"
$EXE_FILE = $null
$SIG_FILE = $null
if (Test-Path $NSIS_DIR) {
    Get-ChildItem $NSIS_DIR -Recurse | Where-Object { $_.Name -match $VERSION } | ForEach-Object {
        Copy-Item $_.FullName -Destination $DEPLOY_DIR
        Write-Host "Copied: $($_.Name)" -ForegroundColor Green
        if ($_.Extension -eq ".exe") { $EXE_FILE = $_ }
        if ($_.Extension -eq ".sig") { $SIG_FILE = $_ }
    }
}

# Copy MSI artifacts if they exist
$MSI_DIR = Join-Path $BUNDLE_DIR "msi"
if (Test-Path $MSI_DIR) {
    Get-ChildItem $MSI_DIR -Recurse | Where-Object { $_.Name -match $VERSION } | ForEach-Object {
        Copy-Item $_.FullName -Destination $DEPLOY_DIR
        Write-Host "Copied: $($_.Name)" -ForegroundColor Green
    }
}

# Get file info
if ($EXE_FILE) {
    $FILENAME = $EXE_FILE.Name
    $FILE_SIZE = $EXE_FILE.Length
    $SIGNATURE = (Get-Content $SIG_FILE.FullName -Raw).Trim()

    # Generate latest.json
    # Tauri v2 uses "windows-x86_64" as the platform key
    $LATEST_JSON = @{
        version = $VERSION
        notes = "Update to version $VERSION"
        pub_date = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        platforms = @{
            "windows-x86_64" = @{
                signature = $SIGNATURE
                url = "https://main.bank-sampah-updates.pages.dev/$FILENAME"
            }
        }
    } | ConvertTo-Json -Depth 4

    $LATEST_PATH = Join-Path $DEPLOY_DIR "latest.json"
    [System.IO.File]::WriteAllText($LATEST_PATH, $LATEST_JSON, [System.Text.UTF8Encoding]::new($false))
    Write-Host "Generated latest.json" -ForegroundColor Green
}

Write-Host ""
Write-Host "Deploying to Cloudflare Pages..." -ForegroundColor Cyan
Write-Host ""

# Deploy using Wrangler
Set-Location $PROJECT_ROOT
npx wrangler pages deploy $DEPLOY_DIR --project-name=bank-sampah-updates --branch=main --commit-dirty=true

Write-Host ""
Write-Host "Update deployed! URL: https://main.bank-sampah-updates.pages.dev/latest.json" -ForegroundColor Green
