# Stable local API: single worker, no --reload.
# Also clears zombie listeners on port 8000 (multiple LISTENING PIDs break Flutter Web — CORS-looking 500s).
param(
    [int]$Port = 8000
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

$pids = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    ForEach-Object { $_.OwningProcess } |
    Sort-Object -Unique)
foreach ($procId in $pids) {
    if ($procId -and $procId -gt 0) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
}
Start-Sleep -Seconds 1

.\.venv\Scripts\Activate.ps1
$env:PYTHONPATH = (Get-Location).Path
Write-Host "Starting uvicorn on 0.0.0.0:$Port (no --reload) ..."
uvicorn app.main:app --host 0.0.0.0 --port $Port
