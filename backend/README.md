# Booking backend

Run PostgreSQL and configure `.env` before starting the backend.

## Development with live reload (Windows)

Install Air once:

```powershell
go install github.com/air-verse/air@latest
```

Stop any backend already using port 8080, then run:

```powershell
cd D:\booking\backend
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Saving Go source, module files, PowerShell scripts, or `.env` regenerates
Swagger, rebuilds the backend, and restarts it. Generated `docs` and `tmp`
files are excluded to avoid rebuild loops. Refresh the browser to see updated
Swagger at http://localhost:8080/swagger/index.html. Stop Air with Ctrl+C.

The existing startup AutoMigrate runs on every restart.

Run without live reload using `go run ./src`.
