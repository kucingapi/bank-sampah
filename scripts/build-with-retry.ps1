# Build Tauri app with retry logic for file lock issues
$ErrorActionPreference = "Stop"

$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "banksampah2026"
$env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content "$PSScriptRoot\..\.env" -Raw)

$MAX_RETRIES = 3
$RETRY_DELAY = 5

for ($i = 1; $i -le $MAX_RETRIES; $i++) {
    Write-Host "`n=== Build attempt $i of $MAX_RETRIES ===" -ForegroundColor Cyan
    
    try {
        npm run tauri:build
        Write-Host "`nBuild succeeded!" -ForegroundColor Green
        exit 0
    } catch {
        $errorMsg = $_.Exception.Message
        
        if ($errorMsg -match "os error 32|being used by another process") {
            Write-Host "File locked. Waiting $RETRY_DELAY seconds before retry..." -ForegroundColor Yellow
            
            # Kill common lockers
            Get-Process | Where-Object { $_.ProcessName -match "msiexec|SearchIndexer|Antimalware" } | Stop-Process -Force -ErrorAction SilentlyContinue
            
            Start-Sleep -Seconds $RETRY_DELAY
            $RETRY_DELAY *= 2
        } else {
            Write-Host "Build failed with unexpected error:" -ForegroundColor Red
            Write-Host $errorMsg -ForegroundColor Red
            exit 1
        }
    }
}

Write-Host "`nBuild failed after $MAX_RETRIES attempts." -ForegroundColor Red
exit 1
