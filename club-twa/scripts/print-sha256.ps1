param(
    [switch]$Debug,
    [string]$Keystore = "",
    [string]$Alias = "club",
    [string]$StorePass = ""
)

$ErrorActionPreference = "Stop"

if ($Debug) {
    $Keystore = Join-Path $env:USERPROFILE ".android\debug.keystore"
    $Alias = "androiddebugkey"
    $StorePass = "android"
    $keyPass = "android"
} else {
    if (-not $Keystore) {
        Write-Host "Usage:"
        Write-Host "  .\scripts\print-sha256.ps1 -Debug"
        Write-Host "  .\scripts\print-sha256.ps1 -Keystore path\to.keystore -Alias club -StorePass SECRET"
        exit 1
    }
    $keyPass = $StorePass
}

if (-not (Test-Path $Keystore)) {
    throw "Keystore not found: $Keystore"
}

$args = @(
    "-list", "-v",
    "-keystore", $Keystore,
    "-alias", $Alias
)
if ($StorePass) {
    $args += @("-storepass", $StorePass, "-keypass", $keyPass)
}

Write-Host "Keystore: $Keystore"
Write-Host "Alias:    $Alias"
Write-Host ""

$output = & keytool @args 2>&1 | Out-String
$match = [regex]::Match($output, "SHA256:\s*([0-9A-Fa-f:]+)")
if (-not $match.Success) {
    Write-Host $output
    throw "Could not parse SHA256 from keytool output"
}

$sha = $match.Groups[1].Value.ToUpperInvariant()
Write-Host "SHA256 (paste into assetlinks.json):"
Write-Host $sha
Write-Host ""
Write-Host "JSON snippet:"
Write-Host "  `"$sha`""
