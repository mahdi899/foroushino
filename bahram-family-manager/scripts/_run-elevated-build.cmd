powershell -NoProfile -ExecutionPolicy Bypass -File "D:\foroushino\bahram-family-manager\scripts\build-apk-elevated.ps1"
Set-Content -Path "D:\foroushino\bahram-family-manager\build-apk.done" -Value $LASTEXITCODE
