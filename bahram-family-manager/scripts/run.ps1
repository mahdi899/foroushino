param(
  [ValidateSet('web', 'android', 'windows')]
  [string]$Target = 'web',
  [string]$ApiUrl = '',
  [switch]$NoBrowser
)

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $ProjectRoot -Parent
$Flutter = Join-Path $RepoRoot '.tools\flutter\bin\flutter.bat'
$NodeCmd = Get-Command node -ErrorAction SilentlyContinue
$Node = if ($NodeCmd) { $NodeCmd.Source } else { $null }

$WebPort = 7357
$WebInternalPort = 7358
$ApiPort = 8010

function Stop-ListenerOnPort([int]$Port) {
  $lines = netstat -ano | Select-String ":$Port\s"
  foreach ($line in $lines) {
  if ($line -match '\s+(\d+)\s*$') {
      $procId = [int]$Matches[1]
      if ($procId -gt 0 -and $procId -ne $PID) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
      }
    }
  }
}

if (-not (Test-Path $Flutter)) {
  Write-Error "Flutter not found at: $Flutter"
  exit 1
}

if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
  switch ($Target) {
    'android' { $ApiUrl = "http://10.0.2.2:${ApiPort}/api/v1" }
    'windows' { $ApiUrl = "http://127.0.0.1:${ApiPort}/api/v1" }
    default   { $ApiUrl = "http://localhost:${WebPort}/api/v1" }
  }
}

Push-Location $ProjectRoot
try {
  Write-Host '>> flutter pub get' -ForegroundColor Cyan
  & $Flutter pub get
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  $define = "--dart-define=API_BASE_URL=$ApiUrl"

  if ($Target -eq 'web') {
    if (-not $Node) {
      Write-Error 'Node.js is required for web dev proxy. Install Node or use -Target windows/android.'
      exit 1
    }

    Stop-ListenerOnPort $WebPort
    Stop-ListenerOnPort $WebInternalPort
    Start-Sleep -Milliseconds 500

    $proxyScript = Join-Path $PSScriptRoot 'dev-web.mjs'
    $flutterArgs = @(
      'run', '-d', 'web-server',
      '--web-hostname=127.0.0.1',
      "--web-port=$WebInternalPort",
      $define
    )

    Write-Host ">> flutter $($flutterArgs -join ' ')" -ForegroundColor Cyan
    $flutterProc = Start-Process -FilePath $Flutter -ArgumentList $flutterArgs -PassThru -NoNewWindow

    Start-Sleep -Seconds 2
    Write-Host ">> node dev-web.mjs (public port $WebPort)" -ForegroundColor Cyan
    $env:FAMILY_WEB_PORT = "$WebPort"
    $env:FAMILY_WEB_INTERNAL_PORT = "$WebInternalPort"
    $env:FAMILY_API_PORT = "$ApiPort"

    if (-not $NoBrowser) {
      $openUrl = "http://localhost:$WebPort"
      Start-Job -ArgumentList $openUrl -ScriptBlock {
        param($url)
        Start-Sleep -Seconds 6
        Start-Process $url
      } | Out-Null
    }

    Write-Host ''
    Write-Host "  Open: http://localhost:$WebPort" -ForegroundColor Green
    Write-Host '  (random ports like 50408 are no longer used)' -ForegroundColor DarkGray
    Write-Host ''

    try {
      & $Node $proxyScript
    }
    finally {
      if ($flutterProc -and -not $flutterProc.HasExited) {
        Stop-Process -Id $flutterProc.Id -Force -ErrorAction SilentlyContinue
      }
    }
    exit $LASTEXITCODE
  }

  Write-Host ">> flutter run -d $Target $define" -ForegroundColor Cyan
  switch ($Target) {
    'android' { & $Flutter run $define }
    'windows' { & $Flutter run -d windows $define }
  }
}
finally {
  Pop-Location
}
