$ErrorActionPreference = "Continue"

$env:JAVA_HOME = "D:\dev-tools\jdk\jdk-17.0.14+7"
$env:ANDROID_HOME = "D:\dev-tools\android-sdk"
$env:ANDROID_SDK_ROOT = "D:\dev-tools\android-sdk"
$env:PUB_HOSTED_URL = "https://pub.flutter-io.cn"
$env:FLUTTER_STORAGE_BASE_URL = "https://storage.flutter-io.cn"
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;D:\flutter\bin;$env:Path"

$log = "D:\foroushino\bahram-family-manager\build-apk.log"
$marker = "D:\foroushino\bahram-family-manager\build-apk.done"
Remove-Item $marker -Force -ErrorAction SilentlyContinue

function Log($msg) {
  $line = "$(Get-Date -Format o) $msg"
  Add-Content -Path $log -Value $line -Encoding UTF8
}

Set-Content -Path $log -Value "APK build started" -Encoding UTF8
Set-Location "D:\foroushino\bahram-family-manager"

try {
  New-Item -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Force | Out-Null
  New-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\AppModelUnlock" -Name AllowDevelopmentWithoutDevLicense -PropertyType DWord -Value 1 -Force | Out-Null
  Log "Developer Mode registry enabled"
} catch {
  Log "Could not set Developer Mode: $($_.Exception.Message)"
}

Log "whoami=$(whoami)"
Log "JAVA_HOME=$env:JAVA_HOME"
Log "ANDROID_HOME=$env:ANDROID_HOME"
Log "PUB_HOSTED_URL=$env:PUB_HOSTED_URL"

# Symlink test
$testLink = "D:\dev-tools\symlink-test2"
$testTarget = "D:\dev-tools\jdk"
Remove-Item $testLink -Force -ErrorAction SilentlyContinue
cmd /c "mklink /D `"$testLink`" `"$testTarget`"" 2>&1 | ForEach-Object { Log "mklink: $_" }
if (Test-Path $testLink) {
  Log "SYMLINK_OK"
  Remove-Item $testLink -Force
} else {
  Log "SYMLINK_FAILED"
}

Log "pub get..."
$pubOut = & "D:\flutter\bin\flutter.bat" pub get 2>&1 | Out-String
Add-Content -Path $log -Value $pubOut -Encoding UTF8
if ($LASTEXITCODE -ne 0) {
  Log "pub get failed: $LASTEXITCODE"
  Set-Content -Path $marker -Value $LASTEXITCODE
  exit $LASTEXITCODE
}

Log "build apk..."
$buildOut = & "D:\flutter\bin\flutter.bat" build apk --release --dart-define=API_BASE_URL=https://rostami.app/api/v1 2>&1 | Out-String
Add-Content -Path $log -Value $buildOut -Encoding UTF8
$code = $LASTEXITCODE
Log "build exit: $code"

$apkDir = "D:\foroushino\bahram-family-manager\build\app\outputs\flutter-apk"
if (Test-Path $apkDir) {
  Get-ChildItem $apkDir | ForEach-Object { Log "APK: $($_.FullName) ($([math]::Round($_.Length/1MB,2)) MB)" }
}

Set-Content -Path $marker -Value $code
exit $code
