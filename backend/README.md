# Booking backend

Run PostgreSQL and configure `.env` before starting the backend.

## Backend-only Docker Compose

`compose.yaml` trong thư mục này chạy backend từ Docker Hub và PostgreSQL. Compose ở root chạy cả frontend và backend.

```sh
cd backend
cp .env.example .env
# Đặt POSTGRES_PASSWORD và JWT_SECRET thật trong .env.
docker compose pull
docker compose up -d --wait
```

API mặc định ở `127.0.0.1:8080`. Compose tự cấu hình `DB_STR` đến service `db`; biến `DB_STR` trong `.env.example` dành cho chạy Go trực tiếp trên host. Trên VPS, đặt file Compose này và `.env` vào `~/booking` để khớp CD hiện tại. Giữ nguyên mật khẩu DB đã khởi tạo và không xóa volume dữ liệu khi cập nhật.

## Thêm dữ liệu mẫu hàng loạt

Tài khoản owner phải đăng ký trước. Lệnh dưới tạo 20 khách sạn mẫu ở 10 thành phố Việt Nam, 3 loại phòng/khách sạn (10 Standard, 6 Deluxe, 4 Family), giá VND và tồn phòng trong 90 ngày tính từ hôm nay theo giờ Việt Nam:

```sh
cd ~/booking
docker compose pull backend
docker compose up -d --no-build backend
docker compose exec -T backend /app/seed -owner-email hoangphatnguyen1208@gmail.com
```

Chạy từ source với `backend/.env` trỏ đúng database:

```sh
go run ./cmd/seed -owner-email hoangphatnguyen1208@gmail.com -hotels 20 -days 90
```

Có thể đặt `-from YYYY-MM-DD` (ngày bắt đầu, bao gồm). Ngày kết thúc là ngày loại trừ. Seed dùng slug `booking-demo-001`..., tên có hậu tố `(Mẫu)`, địa chỉ là dữ liệu giả. Seed gán owner nhưng không cấp admin hoặc tạo tài khoản/mật khẩu. Chạy lại bỏ qua toàn bộ hotel có slug đã tồn tại (kể cả đã archive); không cập nhật giá/tồn, đặt lại reserved hoặc gia hạn lịch cũ. Mỗi lượt chạy nằm trong một transaction; có lỗi sẽ rollback. Lệnh chỉ chạy khi được gọi, không tự seed lúc server khởi động.

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

Startup applies immutable, versioned SQL migrations from src/db/migrations.
Environment variables override the optional .env file. JWT_SECRET must contain at least 32 characters.

Run without live reload using `go run ./src`.

See [the project runbook](../README.md) for admin bootstrap, membership permissions, PostgreSQL integration tests, Docker, backup and release procedures. The doc folder contains the long-term project plan.
