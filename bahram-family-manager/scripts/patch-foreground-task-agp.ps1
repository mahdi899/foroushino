# Patches flutter_foreground_task's nested AGP classpath and androidx.core
# to versions already present in this project's Gradle cache / mirrors.
# The published plugin asks for AGP 8.6.0 + core-ktx 1.15.0 which often fail
# to resolve on restricted networks.
#
# Run after `flutter pub get` (or whenever that plugin is re-fetched).

$ErrorActionPreference = 'Stop'
$pkg = Join-Path $env:LOCALAPPDATA 'Pub\Cache\hosted\pub.dev'
$matches = Get-ChildItem -Path $pkg -Directory -Filter 'flutter_foreground_task-*' -ErrorAction SilentlyContinue
if (-not $matches) {
  Write-Host 'flutter_foreground_task not in pub cache — nothing to patch.'
  exit 0
}

foreach ($dir in $matches) {
  $gradle = Join-Path $dir.FullName 'android\build.gradle'
  if (-not (Test-Path $gradle)) { continue }
  $text = Get-Content -Raw $gradle
  $patched = $text
  $patched = [regex]::Replace(
    $patched,
    "classpath 'com\.android\.tools\.build:gradle:[^']+'",
    "classpath 'com.android.tools.build:gradle:8.9.1'"
  )
  $patched = [regex]::Replace(
    $patched,
    "implementation 'androidx\.core:core-ktx:[^']+'",
    "implementation 'androidx.core:core-ktx:1.13.1'"
  )
  if ($patched -ne $text) {
    Set-Content -Path $gradle -Value $patched -NoNewline
    Write-Host "Patched $($dir.Name)"
  } else {
    Write-Host "Already patched or unexpected format: $($dir.Name)"
  }
}
