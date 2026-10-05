$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    & "$PSScriptRoot/swagger.ps1"
    New-Item -ItemType Directory -Force tmp | Out-Null
    go build -o ./tmp/backend.exe ./src
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
} finally {
    Pop-Location
}
