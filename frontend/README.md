# Booking frontend

Vietnamese React + TypeScript frontend for the booking system.

```powershell
npm ci
npm run dev
```

Run the Go backend on port 8080 for registration, login, and profile. Vite forwards `/api/v1` requests to that server. The hotel collection is explicitly labeled sample data; reservations are not implemented in the backend yet.

```powershell
npm run build
npm run lint
npx playwright install chromium
npm test
```

See [the full frontend guide](../doc/frontend.md) for configuration, production hosting, session behavior, and test coverage.
