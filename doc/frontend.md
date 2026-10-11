# Frontend build and implementation guide

The frontend is implemented with React, TypeScript, and Vite. It includes a Vietnamese responsive interface, authentication through the existing backend, a sample hotel collection, local favorites, detail dialogs, and clear placeholders for booking features that do not yet have backend APIs.

## Run locally

Prerequisites: Node.js 22.12+ (Node 24.16 was used for verification), npm, and the backend for authentication.

```powershell
Set-Location D:\booking\frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. In another terminal, run the backend:

```powershell
Set-Location D:\booking\backend
go run ./src
```

Vite proxies `/api/v1` to `http://localhost:8080` for development and local preview. The current backend uses `/api/v1/auth/register`, `/api/v1/auth/login`, and `/api/v1/auth/me`. A running PostgreSQL instance and `backend/.env` are required for the backend.

## Implemented behavior

| Feature | Data source / behavior |
| --- | --- |
| Registration | POST `/api/v1/auth/register`; checks minimum 8 Unicode characters and maximum 72 UTF-8 bytes; signs in separately afterward |
| Login | POST `/api/v1/auth/login`; handles invalid credentials, connection errors, and pending requests |
| Profile | GET `/api/v1/auth/me` with the bearer token; retry for failed requests |
| Session | Access token in memory; expiry or HTTP 401 clears session; reload requires signing in again |
| Logout | Clears client token and profile; backend has no revocation/logout endpoint |
| Discovery | Three explicitly labeled sample properties, destination filtering, and category filters |
| Favorites | Sample property IDs persisted in localStorage on this device, independent of account |
| Detail | Accessible native modal; sample information and save action |
| Trips | Explains that reservations/history are not yet available |

Dates are validated, but search does not check room availability or guest capacity. Sample prices and ratings are illustrative. There is no real reservation or payment flow, and no hotel data is fetched from an invented endpoint.

## Structure

```text
frontend/
  src/
    App.tsx             Navigation, discovery, profile, authentication dialogs
    App.css             Responsive layout and CSS illustrations
    index.css           Base styles and keyboard focus indicators
    api.ts              Typed API requests, timeout, cancellation, error handling
    catalog.ts          Explicit sample data, formatting, saved IDs
    main.tsx            React entry point
  tests/booking.spec.ts  Browser integration tests with mocked API responses
  playwright.config.ts  Desktop and mobile Chromium test projects
  vite.config.ts        Development and preview API proxy
  .env.example          Public API URL example
```

## Configuration and production build

The default API base is `/api/v1`. To override it, copy `.env.example` to `.env` and change `VITE_API_BASE_URL`. This is public, build-time configuration. Do not place backend secrets or database credentials in frontend environment variables.

```powershell
npm run build
npm run preview
```

Output is `frontend/dist`. Production hosting must serve those files and forward `/api/v1` to the Go backend using a reverse proxy. Vite's local proxy is not bundled into the production assets. If using an absolute API URL on a different origin, configure backend CORS for that origin. Build again after changing the public API URL.

## Verification

```powershell
npm run lint
npx playwright install chromium
npm test
```

The 14 browser checks cover desktop/mobile rendering, search and empty results, category filtering, favorite persistence, detail dialogs, registration/password validation, login/profile/bearer headers/logout, invalid credentials, connection failure, HTTP 401, and token expiry. API responses are mocked, so these checks do not prove database-backed authentication works. Run registration and login against the real local backend before deployment.

Use `npm run format` to format source and tests. Test screenshots and traces are generated under `frontend/test-results` and ignored by Git.

## Next integration

Replace `catalog.ts` with a real hotel API adapter after hotel routes and response contracts exist. Then add rooms, date/guest availability, reservation creation, and reservation history. The server must own availability, prices, and authorization. Keep loading, failure, and empty states when replacing sample data.
