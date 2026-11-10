Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not $env:ADMIN_PASSWORD) {
  $secret = Read-Host 'Choose a local admin password (12+ characters)' -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secret)
  try { $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

if ($env:ADMIN_PASSWORD.Length -lt 12) {
  Write-Error 'The admin password needs at least 12 characters.'
  exit 1
}

if (-not $env:ENABLE_GIT_PUBLISH) { $env:ENABLE_GIT_PUBLISH = 'true' }

if (-not (Test-Path 'node_modules/express')) {
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

Write-Host 'Open http://127.0.0.1:3000/admin in your browser.'
try { node admin/server.js }
finally { Remove-Item Env:\ADMIN_PASSWORD -ErrorAction SilentlyContinue }
