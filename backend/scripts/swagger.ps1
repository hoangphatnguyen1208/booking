$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    go run github.com/swaggo/swag/cmd/swag@v1.16.6 init -g src/main.go -o docs
    if ($LASTEXITCODE -ne 0) { throw 'Swagger generation failed.' }
} finally {
    Pop-Location
}
