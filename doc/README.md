# Booking system documentation

This folder describes how to build and run the existing backend (BE), and how to implement the frontend (FE) and remaining booking features. Paths and commands assume the repository root is `D:\booking`; adjust it for your checkout.

- [Backend build and development guide](backend.md)
- [Frontend build and implementation guide](frontend.md)

## Current system

| Component | Current state |
| --- | --- |
| Backend | Go API using Gin, GORM, PostgreSQL, bcrypt, and JWT |
| Authentication | Registration, login, Swagger token form, and authenticated profile endpoint |
| Hotels | Database model, repository, and create service; no HTTP routes registered |
| Frontend | React + TypeScript + Vite; Vietnamese responsive UI, real authentication integration, and a clearly labeled sample hotel collection |
| Booking | No rooms, availability, reservations, or payment implementation |
| API documentation | Generated Swagger files in `backend/docs` |

The current request path is `Gin router -> controller -> service -> repository -> PostgreSQL`. JWT middleware protects `/api/v1/auth/me`. Startup loads `backend/.env`, connects to PostgreSQL, migrates the user and hotel tables, then listens on port 8080.

## Implementation sequence

1. Build and run the backend with a local database; verify authentication.
2. Run the frontend and verify registration, login, and profile against the backend at `/api/v1/auth`.
3. Complete hotel controllers, validation, list/search/detail endpoints, and admin authorization before exposing hotel writes.
4. Add rooms, inventory, date-based availability, and reservation models and APIs. Define prices, currency, cancellation rules, and booking statuses before implementation.
5. Build search, hotel details, booking confirmation, and reservation history screens against those APIs.
6. Verify concurrent reservations cannot oversell inventory, unauthorized users cannot access another user's bookings, and both builds pass before deployment.

Steps 3–6 are planned work. Endpoint names and data contracts for those features must be agreed and documented before the frontend integrates them.

