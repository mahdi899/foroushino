#Requires -Version 5.1
<#
.SYNOPSIS
  Generate android.keystore for Club TWA and sync SHA-256 fingerprint to frontend.

.DESCRIPTION
  Creates a signing key (if missing), prints the SHA-256 fingerprint for Digital Asset
  Links, updates twa-manifest.json fingerprints, and syncs bahram-cm/frontend/data/twa-asset-links.json.

  After running, deploy frontend so https://rostami.club/.well-known/assetlinks.json
  includes the fingerprint, then run: npm run update && npm run build
#>
param(
  [string]$Alias = 'family-twa',
  [string]$Keystore = 'android.keystore',
  [int]$ValidityDays = 10000
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Resolve-Keytool {
  $candidates = @(
    $env:JAVA_HOME,
    "$env:USERPROFILE\.bubblewrap\jdk",
    'C:\Program Files\Android\Android Studio\jbr',
    'C:\Program Files\Java\jdk-17'
  ) | Where-Object { $_ -and (Test-Path $_) }

  foreach ($base in $candidates) {
    $keytool = Join-Path $base 'bin\keytool.exe'
    if (Test-Path $keytool) { return $keytool }
  }

  throw @"
keytool not found. Install JDK 17 (or run bubblewrap once to download ~/.bubblewrap/jdk), then retry.
  winget install Microsoft.OpenJDK.17
"@
}

$Keytool = Resolve-Keytool
$KeystorePath = Join-Path $Root $Keystore

if (-not (Test-Path $KeystorePath)) {
  Write-Host "Creating keystore: $KeystorePath"
  $dname = 'CN=Rostami Club TWA, OU=Family, O=Rostami, L=Tehran, ST=Tehran, C=IR'
  $args = @(
    '-genkeypair',
    '-v',
    '-keystore', $KeystorePath,
    '-alias', $Alias,
    '-keyalg', 'RSA',
    '-keysize', '2048',
    '-validity', "$ValidityDays",
    '-storepass', 'android',
    '-keypass', 'android',
    '-dname', $dname
  )
  & $Keytool @args
  Write-Host ''
  Write-Host 'Keystore created with default passwords (store/key = android).' -ForegroundColor Yellow
  Write-Host 'Change passwords before Play Store release.' -ForegroundColor Yellow
}

$listing = & $Keytool -list -v -keystore $KeystorePath -alias $Alias -storepass android 2>&1 | Out-String
if ($listing -notmatch 'SHA256:\s*([0-9A-F:]+)') {
  throw "Could not parse SHA-256 fingerprint from keytool output."
}
$fingerprint = $Matches[1].Trim().ToUpper()
Write-Host "SHA-256 fingerprint: $fingerprint" -ForegroundColor Green

$manifestPath = Join-Path $Root 'twa-manifest.json'
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
$manifest.signingKey = @{
  path = "./$Keystore"
  alias = $Alias
}
$existing = @()
if ($manifest.fingerprints) {
  foreach ($entry in $manifest.fingerprints) {
    if ($entry -is [string]) { $existing += $entry.ToUpper() }
    elseif ($entry.value) { $existing += $entry.value.ToUpper() }
  }
}
if ($existing -notcontains $fingerprint) {
  $existing += $fingerprint
}
$manifest.fingerprints = $existing
$manifest | ConvertTo-Json -Depth 10 | Set-Content -Path $manifestPath -Encoding utf8NoBOM

node (Join-Path $PSScriptRoot 'sync-assetlinks.mjs') --fingerprint $fingerprint

Write-Host ''
Write-Host 'Next steps:'
Write-Host '  1. Deploy frontend (assetlinks.json must be live on rostami.club)'
Write-Host '  2. cd bahram-club-twa && npm install && npm run update && npm run build'
Write-Host "  3. APK: bahram-club-twa\app-release-signed.apk"
