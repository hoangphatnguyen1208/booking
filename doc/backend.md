# Backend build and development guide

## Prerequisites

- Go compatible with the `go 1.26.3` directive in `backend/go.mod`.
- A running PostgreSQL instance with `gen_random_uuid()` available, a database, and a user permitted to create and alter tables.
- PowerShell for the existing development and Swagger scripts.
- Air only if live reload is required.

Dependencies are recorded in `go.mod` and `go.sum`. Run commands below from `D:\booking\backend`.

## Configure PostgreSQL and the application

Create a local database using PostgreSQL administration tools or `psql`, for example:

```sql
CREATE USER booking_app WITH PASSWORD 'replace-with-local-password';
CREATE DATABASE booking OWNER booking_app;
```

Create or edit `backend/.env` with your own values:

```dotenv
DB_STR="host=localhost port=5432 user=booking_app password=replace-with-local-password dbname=booking sslmode=disable"
JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRE_TIME=3600
```

| Setting | Meaning |
| --- | --- |
| `DB_STR` | PostgreSQL connection string consumed by GORM |
| `JWT_SECRET` | Secret used to sign and validate HS256 tokens |
| `JWT_EXPIRE_TIME` | Token lifetime in seconds |

The application reads a `.env` file relative to its working directory. The current configuration code does not enable automatic environment-variable overrides. Run the application from `backend`, even when launching a compiled binary. `.env` is ignored by Git; keep real credentials out of documentation and source control. The example disables database TLS for local development; configure TLS appropriately for a hosted database.

Startup calls GORM `AutoMigrate` for `Hotel` and `User`. The database must already exist. There is no seed script or versioned migration system; review schema changes before running against a shared database.

## Download dependencies and run

```powershell
Set-Location D:\booking\backend
go version
go mod download
go run ./src
```

The API listens at `http://localhost:8080`. Open `http://localhost:8080/swagger/index.html` to inspect the API. There is no dedicated health endpoint.

## Build a binary

```powershell
Set-Location D:\booking\backend
New-Item -ItemType Directory -Force bin | Out-Null
go build -o ./bin/backend.exe ./src
./bin/backend.exe
```

For a non-Windows build, use `go build -o ./bin/backend ./src` on the target platform. Compilation does not require a database; running the binary does. Port 8080 is hard-coded in `src/main.go`.

## Swagger and live reload

Regenerate Swagger after changing controller annotations or DTOs:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/swagger.ps1
```

The script runs Swag v1.16.6 and writes `docs/docs.go`, `docs/swagger.json`, and `docs/swagger.yaml`. Those generated API files serve a different purpose from this root `doc` folder.

For live reload:

```powershell
go install github.com/air-verse/air@latest
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev.ps1
```

Air uses `.air.toml`. Source and configuration changes regenerate Swagger, compile `tmp/backend.exe`, and restart the server. Generated `docs` and `tmp` directories are excluded from watching. Stop with Ctrl+C. To run just the same Swagger/build pipeline:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/dev-build.ps1
```

## Existing API contract

| Method | Path | Input / authorization | Success |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | JSON `email`, `password` | 200, user object |
| POST | `/api/v1/auth/login` | JSON `email`, `password` | 200, token response |
| POST | `/api/v1/auth/token` | Form `grant_type=password`, `username` (email), `password` | 200, token response |
| GET | `/api/v1/auth/me` | `Authorization: Bearer <access_token>` | 200, user object |

Registration requires a valid email and a password of at least 8 Unicode characters and at most 72 bytes. Duplicate email returns 409; invalid password or request binding returns 400. Login with invalid credentials returns 400. Missing, invalid, or expired bearer tokens return 401. Ordinary error bodies contain `error`; the token form uses OAuth-style `error` and optional `error_description`.

Token response:

```json
{"access_token":"<jwt>","token_type":"Bearer","expires_in":3600}
```

User responses contain `id`, `email`, `created_at`, and `updated_at`; the password hash is omitted. Registration does not return a token, so sign in afterward. `/api/v1/auth/me` returns a user in the current controller, despite its Swagger success annotation naming `LoginResponse`; use the controller and DTOs to resolve this discrepancy until the annotation is corrected.

Smoke test from PowerShell with a new local test email:

```powershell
$apiBase = 'http://localhost:8080'
$credentials = @{ email = 'dev@example.com'; password = 'local-test-password' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$apiBase/api/v1/auth/register" -ContentType 'application/json' -Body $credentials
$loginResult = Invoke-RestMethod -Method Post -Uri "$apiBase/api/v1/auth/login" -ContentType 'application/json' -Body $credentials
Invoke-RestMethod -Uri "$apiBase/api/v1/auth/me" -Headers @{ Authorization = "Bearer $($loginResult.access_token)" }
```

## Validation and extension

```powershell
go test ./...
go vet ./...
```

The existing Swagger test checks UI assets and auth schema. It does not validate database-backed registration, login, hotel operations, or booking behavior. Run the smoke test with a disposable local database for authentication integration verification.

Add new features in the existing controller/service/repository structure. Register new controllers in `src/main.go`, add models to migration handling, and regenerate Swagger. Hotel repository methods exist, but the service currently exposes only create and no hotel controller is wired. Complete those layers before documenting hotel endpoints as usable.

Before connecting a browser frontend on a different origin, implement an explicit CORS policy or use a same-origin proxy; current `main.go` does not configure CORS. Before deployment, define configurable listening settings, versioned migrations, readiness checks, and authentication/authorization requirements for new features.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Error reading config file | Run from `backend`; ensure `.env` exists |
| Database connection or migration failure | Database service, connection string, database existence, schema permissions, UUID function |
| Port already in use | Stop the other process using 8080 |
| Air missing | Install Air; `dev.ps1` also checks the Go GOPATH bin directory |
| Stale Swagger | Run `scripts/swagger.ps1` and restart the API |
| Browser request blocked | Configure CORS or the frontend development proxy |

