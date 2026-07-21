param(
  [int]$ApiPort = 8010
)

$RepoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$Php = Join-Path $RepoRoot '.tools\php84\php.exe'
$Backend = Join-Path $RepoRoot 'bahram-cm\backend'

if (-not (Test-Path $Php)) {
  Write-Error "PHP 8.4 not found at: $Php"
  exit 1
}

Push-Location $Backend
try {
  Write-Host ">> Laravel serve :$ApiPort" -ForegroundColor Cyan
  $serve = Start-Process -FilePath $Php -ArgumentList @(
    'artisan', 'serve', "--port=$ApiPort"
  ) -PassThru -NoNewWindow

  Start-Sleep -Seconds 2

  Write-Host ">> Queue worker (family-media + default)" -ForegroundColor Cyan
  Write-Host "   بدون این worker آپلود تصویر/صوت/ویدیو در وضعیت queued می‌ماند." -ForegroundColor DarkGray
  $queue = Start-Process -FilePath $Php -ArgumentList @(
    'artisan', 'queue:work', 'redis',
    '--queue=family-media,family-high,family-low,default',
    '--tries=3', '--timeout=600'
  ) -PassThru -NoNewWindow

  Write-Host ""
  Write-Host "  Backend: http://127.0.0.1:$ApiPort" -ForegroundColor Green
  Write-Host "  Ctrl+C برای توقف هر دو پروسس" -ForegroundColor DarkGray
  Write-Host ""

  try {
    Wait-Process -Id $serve.Id
  }
  finally {
    if (-not $queue.HasExited) {
      Stop-Process -Id $queue.Id -Force -ErrorAction SilentlyContinue
    }
  }
}
finally {
  Pop-Location
}
