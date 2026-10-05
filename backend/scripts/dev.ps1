$ErrorActionPreference = 'Stop'
Push-Location (Split-Path $PSScriptRoot -Parent)
try {
    $airCommand = Get-Command air -ErrorAction SilentlyContinue
    if ($airCommand) {
        & $airCommand.Source -c .air.toml
    } else {
        $airExecutable = Join-Path (go env GOPATH) 'bin/air.exe'
        if (-not (Test-Path -LiteralPath $airExecutable)) {
            throw 'Air is missing. Run: go install github.com/air-verse/air@latest'
        }
        & $airExecutable -c .air.toml
    }
    if ($LASTEXITCODE -ne 0) { throw 'Air exited with an error.' }
} finally {
    Pop-Location
}
