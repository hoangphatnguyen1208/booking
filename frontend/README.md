# Booking frontend

Vietnamese React + TypeScript frontend for the booking system.

```powershell
npm ci
npm run dev
```

Run the Go backend on port 8080. Vite forwards `/api/v1` requests to that server. The frontend includes server-side hotel search, booking/cancellation, room/inventory management, hotel membership and system administration. Prices and room availability come from the backend.

```powershell
npm run build
npm run lint
npx playwright install chromium
npm test
```

See [the project runbook](../README.md) for configuration, live end-to-end testing and deployment. [The frontend plan](../doc/frontend.md) describes the longer-term design.

