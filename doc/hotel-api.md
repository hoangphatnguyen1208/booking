# Hotel API

Base URL: `/api/v1`. GET routes are public. POST, PUT, and DELETE require `Authorization: Bearer <token>`. The existing identity model has no roles; all signed-in users currently have write access. Admin/ownership authorization must be designed before exposing hotel management publicly.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/hotels?page=1&limit=20` | Paginated list; limit 1–100, page 1–1000000 |
| GET | `/hotels/{id}` | Full hotel object |
| POST | `/hotels` | Creates a hotel, returns 201 |
| PUT | `/hotels/{id}` | Replaces editable fields, returns persisted hotel |
| DELETE | `/hotels/{id}` | Deletes hotel, returns 200 with confirmation message |

Create/PUT body:

```json
{"name":"Example Hotel","slug":"example-hotel","address":"","city":"Hue","country":"VN","rank":0}
```

Name, city, country, and slug are required. Slug uses lowercase ASCII letters, digits, and separating hyphens. Text limits follow the database columns; rank is 0–5. PUT requires all mandatory fields; omitted address/rank become empty/0. This API does not implement PATCH.

Invalid body/UUID/pagination returns 400, missing/invalid token 401, missing hotel 404, duplicate slug 409, and database failures 500. Updates return UUID and timestamps from PostgreSQL through `RETURNING`. List responses contain `items`, `page`, and `limit`; an empty list uses `items: []`.

Swagger: `http://localhost:8080/swagger/index.html`. Run `go test ./...` and `go vet ./...` from `backend`. Hotel regression tests use a mocked SQL connection, not a live PostgreSQL instance.
