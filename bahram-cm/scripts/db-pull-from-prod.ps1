# Pull production MySQL dump into local bahram_backend (DB only — no media files).
#
# Prerequisites:
#   - SSH host `bahram-prod` works, OR pass -DumpPath to an existing .sql / .sql.gz
#   - Local MySQL reachable via bahram-cm/backend/.env
#   - PHP CLI (uses scripts/import-sql-dump.php — no mysql.exe required)
#
# Usage:
#   pwsh bahram-cm/scripts/db-pull-from-prod.ps1
#   pwsh bahram-cm/scripts/db-pull-from-prod.ps1 -DumpPath "C:\Users\pc\Desktop\backup.sql"
#
param(
    [string] $SshHost = 'bahram-prod',
    [string] $DumpPath = '',
    [switch] $SkipRemoteDump
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Backend = Join-Path $RepoRoot 'bahram-cm\backend'
$EnvFile = Join-Path $Backend '.env'
$BackupDir = Join-Path $Backend 'storage\app\backups\database'
$Importer = Join-Path $Backend 'scripts\import-sql-dump.php'

if (-not (Test-Path $EnvFile)) {
    throw "Missing $EnvFile"
}
if (-not (Test-Path $Importer)) {
    throw "Missing $Importer"
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

if (-not $DumpPath) {
    if ($SkipRemoteDump) {
        throw 'No -DumpPath and -SkipRemoteDump set.'
    }

    Write-Host "==> Dumping on $SshHost (DB only, no media tar)..."
    $remoteStamp = Get-Date -Format 'yyyyMMdd_HHmmss'
    $remoteFile = "/tmp/bahram_pull_${remoteStamp}.sql.gz"
    $sshCmd = @"
set -euo pipefail
ENV=/var/www/bahram-cm/backend/.env
DB_HOST=`$(grep -E '^DB_HOST=' "`$ENV" | cut -d= -f2- | tr -d '"')
DB_PORT=`$(grep -E '^DB_PORT=' "`$ENV" | cut -d= -f2- | tr -d '"')
DB_DATABASE=`$(grep -E '^DB_DATABASE=' "`$ENV" | cut -d= -f2- | tr -d '"')
DB_USERNAME=`$(grep -E '^DB_USERNAME=' "`$ENV" | cut -d= -f2- | tr -d '"')
DB_PASSWORD=`$(grep -E '^DB_PASSWORD=' "`$ENV" | cut -d= -f2- | tr -d '"')
mysqldump -h"`$DB_HOST" -P"`$DB_PORT" -u"`$DB_USERNAME" -p"`$DB_PASSWORD" \
  --single-transaction --quick --routines --triggers "`$DB_DATABASE" \
  | gzip > '$remoteFile'
ls -la '$remoteFile'
echo '$remoteFile'
"@
    $remoteOut = ssh -o BatchMode=yes -o ConnectTimeout=20 $SshHost $sshCmd
    if ($LASTEXITCODE -ne 0) {
        throw 'Remote dump failed. Fix SSH for bahram-prod, or pass -DumpPath to a local .sql/.sql.gz.'
    }
    $remotePath = ($remoteOut | Select-Object -Last 1).ToString().Trim()
    $DumpPath = Join-Path $BackupDir ("bahram_prod_{0}.sql.gz" -f (Get-Date -Format 'yyyyMMdd_HHmmss'))
    Write-Host "==> scp $remotePath -> $DumpPath"
    scp "${SshHost}:${remotePath}" $DumpPath
    ssh -o BatchMode=yes $SshHost "rm -f '$remotePath'" | Out-Null
}

if (-not (Test-Path $DumpPath)) {
    throw "Dump not found: $DumpPath"
}

$workSql = $DumpPath
$cleanup = $null
$ext = [System.IO.Path]::GetExtension($DumpPath).ToLowerInvariant()
if ($ext -eq '.gz') {
    $workSql = Join-Path $env:TEMP ("bahram_import_{0}.sql" -f ([guid]::NewGuid().ToString('N')))
    $cleanup = $workSql
    Write-Host "==> Decompressing gzip → $workSql"
    $in = [System.IO.File]::OpenRead($DumpPath)
    $gzip = New-Object System.IO.Compression.GzipStream($in, [System.IO.Compression.CompressionMode]::Decompress)
    $out = [System.IO.File]::Create($workSql)
    try {
        $gzip.CopyTo($out)
    }
    finally {
        $out.Close(); $gzip.Close(); $in.Close()
    }
}

$mediaBefore = @(Get-ChildItem (Join-Path $Backend 'storage\app\public\media\site') -File -ErrorAction SilentlyContinue).Count
Write-Host "==> Importing into local DB (media files on disk are NOT touched; site files before=$mediaBefore)"
Push-Location $Backend
try {
    php $Importer $workSql
    if ($LASTEXITCODE -ne 0) { throw 'import-sql-dump.php failed' }

    Write-Host '==> php artisan migrate (apply any newer local migrations)'
    php artisan migrate --force

    Write-Host '==> php artisan media:sync (index only; does not overwrite media binaries)'
    php artisan media:sync
}
finally {
    Pop-Location
    if ($cleanup -and (Test-Path $cleanup)) { Remove-Item $cleanup -Force }
}

$mediaAfter = @(Get-ChildItem (Join-Path $Backend 'storage\app\public\media\site') -File -ErrorAction SilentlyContinue).Count
Write-Host "==> Done. Local media/site file count: $mediaAfter (was $mediaBefore)"
Write-Host '    storage/app/public/media left untouched.'
