# Booking — hotel booking MVP

Ứng dụng đặt phòng gồm Go/Gin/PostgreSQL và Next.js/React/TypeScript. Kế hoạch phát triển dài hạn nằm trong [doc](doc/README.md); hướng dẫn này mô tả cách chạy và vận hành bản MVP.

## Chức năng

- Đăng ký/đăng nhập, hồ sơ, JWT và giới hạn thử đăng nhập.
- Tìm khách sạn trên server theo điểm đến, hạng sao và availability theo ngày/số khách.
- Thông tin khách sạn, ảnh đại diện HTTPS, tiện nghi và lưu yêu thích trên thiết bị.
- Chủ khách sạn quản lý loại phòng, số lượng và giá theo từng ngày.
- Quản lý nhiều người qua owner/manager/staff, kiểm tra quyền trên backend.
- Đặt phòng có transaction, khóa tồn và Idempotency-Key; giá được server xác nhận lại.
- Lịch sử/chi tiết đơn, hủy miễn phí trước 00:00 ngày nhận phòng và trả tồn đúng một lần.
- Quản trị người dùng/admin, nhật ký thao tác, xác nhận checkout/đã thu tiền tại khách sạn.
- Migration SQL có phiên bản/checksum, CI, Docker Compose và test PostgreSQL/browser.

MVP dùng VND, ngày lưu trú và hạn hủy theo giờ Việt Nam. Một đơn đặt một loại phòng thuộc một khách sạn. Giá là tổng giá các đêm nhân số phòng; không có cổng thanh toán trực tuyến hoặc giữ phòng chờ thanh toán.

Ảnh được nhập bằng URL HTTPS, không có dịch vụ upload file. Email xác nhận, refresh token, khuyến mãi, đánh giá và thanh toán trực tuyến thuộc giai đoạn mở rộng. Token frontend ở bộ nhớ: tải lại trang cần đăng nhập lại.

## Chạy với Docker

Cần Docker Compose và Docker Engine đang chạy.

```powershell
Copy-Item .env.example .env
# Sửa POSTGRES_PASSWORD và JWT_SECRET trong .env trước khi chạy.
docker compose up --build -d
```

Mở [http://localhost:8088](http://localhost:8088). Dùng mật khẩu DB dài dạng chữ/số cho DSN của Compose; JWT_SECRET ít nhất 32 ký tự ngẫu nhiên. Không commit file .env. Database chỉ ở mạng nội bộ Compose.

Bản Compose bind web vào localhost; để triển khai public, đặt TLS reverse proxy phía trước và cấu hình đúng TRUSTED_PROXIES. Mount PostgreSQL 18 dùng /var/lib/postgresql theo [hướng dẫn image chính thức](https://hub.docker.com/_/postgres).

## VPS chỉ chạy backend

Dùng [compose.backend.yaml](compose.backend.yaml), gồm backend từ Docker Hub và PostgreSQL với volume lưu dữ liệu, healthcheck và tự khởi động lại. Đặt nội dung file này thành `~/booking/compose.yaml` trên VPS, cùng `.env` theo [.env.example](.env.example), rồi chạy:

```sh
cd ~/booking
docker compose pull
docker compose up -d --wait
```

API mặc định tại `127.0.0.1:8080`; đặt HTTPS reverse proxy phía trước. Nếu cần mở cổng API ra ngoài, đổi `BACKEND_BIND=0.0.0.0`. PostgreSQL không publish cổng. Password DB nên dùng chuỗi chữ/số dài và giữ nguyên sau khi đã khởi tạo volume. CD hiện tại sẽ dùng chính Compose có sẵn trong thư mục `booking` này; VPS không cần source code. Nếu image private, đăng nhập Docker Hub trên VPS trước. Không xóa volume khi cập nhật.

## Chạy trực tiếp

Backend cần Go tương thích go.mod và PostgreSQL:

```powershell
Set-Location backend
Copy-Item .env.example .env
# Điền database và secret của bạn.
go run ./src
```

Frontend cần Node 24:

```powershell
Set-Location frontend
npm ci
npm run dev
```

Frontend mở tại http://127.0.0.1:5173. Next.js rewrite /api/v1 đến http://127.0.0.1:8080; đổi BACKEND_ORIGIN trong frontend/.env.local nếu backend dùng địa chỉ khác. Production đọc target rewrite lúc build. Docker chạy Next.js standalone tại cổng 3000 trong container, chuyển tiếp API đến backend:8080 cùng origin nên không cần CORS. Xem [frontend README](frontend/README.md) để biết routing và cấu hình.

Swagger ở [http://localhost:8080/swagger/index.html](http://localhost:8080/swagger/index.html). Health: /healthz; readiness kiểm tra DB: /readyz.

## Luồng sử dụng đầu tiên

1. Đăng ký một tài khoản và đăng nhập.
2. Vào Quản lý, tạo khách sạn. Người tạo tự trở thành owner trong transaction.
3. Mở Phòng và nhân sự, tạo loại phòng, bật trạng thái đang bán.
4. Chọn loại phòng và thiết lập giá/tồn cho khoảng ngày. Ngày kết thúc là ngày loại trừ.
5. Khách khác đăng ký, tìm khoảng ngày có tồn, mở khách sạn và chọn phòng.
6. Nhập tên/số điện thoại, xác nhận giá và đặt phòng.
7. Xem/hủy trong Chuyến đi của tôi; owner/manager xem đơn ở trang quản lý.

Nhân viên cần đăng ký tài khoản trước; owner cấp quyền bằng email trong Phòng và nhân sự. Manager không quản lý thành viên hoặc xóa khách sạn; staff chỉ xem đơn. Không thể xóa owner cuối cùng.

Xóa khách sạn là lưu trữ (soft delete). Ngừng bán phòng giữ nguyên lịch sử booking. Xác nhận hoàn thành lưu trú đồng thời xác nhận đã nhận tiền mặt; chỉ thực hiện sau ngày trả phòng.

## Khởi tạo admin và dữ liệu cũ

Không có admin mặc định. Đăng ký tài khoản rồi chạy lệnh quản trị có quyền truy cập máy chủ:

```powershell
Set-Location backend
go run ./cmd/admin -email admin@example.com
```

Với Compose:

```powershell
docker compose exec backend /app/admin -email admin@example.com
```

Đăng nhập lại để hiện tab Admin. Hotel cũ không có membership không tự động được gán cho người đầu tiên đăng nhập. Người vận hành có thể gán một hotel cụ thể:

```powershell
go run ./cmd/admin -email owner@example.com -claim-hotel HOTEL_UUID
```

Lệnh trên cấp cả admin hệ thống: chỉ dùng tài khoản vận hành tin cậy; sau đó dùng UI cấp membership cho tài khoản chủ phù hợp. Không chạy lệnh cho tài khoản khách không tin cậy.

## Kiểm thử

```powershell
Set-Location backend
go test ./...
go vet ./...
```

Test PostgreSQL yêu cầu database test riêng và quyền tạo schema:

```powershell
$env:TEST_DATABASE_URL='host=localhost port=5432 user=booking_test password=test_password dbname=booking_test sslmode=disable'
go test ./src/lodging -count=1
```

Mỗi test tạo schema ngẫu nhiên rồi xóa schema đó. Không trỏ biến này vào database production. Không có TEST_DATABASE_URL thì test integration được skip, không đồng nghĩa đã kiểm tra transaction.

```powershell
Set-Location frontend
npm ci
npx playwright install chromium
npm run build
npm run lint
npm test
```

Live browser tests yêu cầu backend thực đang chạy trên port 8080, dùng database development/test riêng:

```powershell
$env:RUN_LIVE='1'
npm test -- tests/live.spec.ts --workers=1
```

Live tests tạo tài khoản, khách sạn, phòng, tồn và booking trong database backend; dữ liệu .test được giữ để xem kết quả. Không chạy RUN_LIVE trên production. Không chạy hai Playwright invocation đồng thời cùng thư mục test-results.

CI chạy backend với PostgreSQL, frontend mock tests, và end-to-end với backend thật.

## API chính

Tất cả API dưới /api/v1. Route ghi yêu cầu bearer token, trừ đăng ký/đăng nhập.

| Nhóm | API |
| --- | --- |
| Identity | POST /auth/register, /auth/login, /auth/token; GET /auth/me |
| Khách sạn | GET/POST /hotels; GET/PUT/DELETE /hotels/{id}; GET /me/hotels |
| Phòng | GET/POST /hotels/{id}/room-types; GET/PUT/DELETE /room-types/{id} |
| Inventory | GET/PUT /room-types/{id}/inventory |
| Availability | GET /hotels/{id}/availability |
| Booking | GET/POST /bookings; GET /bookings/{id}; POST /bookings/{id}/cancel |
| Quản lý | GET /hotels/{id}/manage-rooms, /members, /bookings; PUT /hotels/{id}/members |
| Checkout | POST /bookings/{id}/complete |
| Admin | GET /admin/users, /admin/audit-logs; PUT /admin/users/{id}/admin |

GET danh sách dùng page/limit (hotel limit tối đa 100; booking/user page size 20). Inventory nhận from/to, capacity và price. Booking gửi Idempotency-Key cùng room_type_id, check_in/check_out, rooms/guests, guest_name, phone và expected_total. Cùng key/payload trả cùng đơn; khác payload với cùng key trả 409.

## Migration, backup và phát hành

Startup áp dụng migration trong backend/src/db/migrations theo thứ tự, khóa migration và lưu checksum. Không sửa migration đã áp dụng; thêm file mới. Migration tạo FK sẽ dừng nếu dữ liệu cũ có orphan: xử lý dữ liệu và chạy lại, không bỏ constraint để chạy tiếp.

Backup Compose không dùng pipeline binary qua Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force backups
docker compose exec -T db pg_dump -U booking -d booking -Fc -f /tmp/booking.dump
docker compose cp db:/tmp/booking.dump ./backups/booking.dump
```

Kiểm tra restore vào database riêng:

```powershell
docker compose exec -T db createdb -U booking booking_restore
docker compose cp ./backups/booking.dump db:/tmp/restore.dump
docker compose exec -T db pg_restore -U booking -d booking_restore --no-owner /tmp/restore.dump
```

Lưu backup ra nơi độc lập với máy chạy DB và kiểm tra định kỳ. Trước deployment: backup, kiểm tra migration trên bản sao dữ liệu, giữ image phiên bản trước, deploy và kiểm tra readiness/luồng booking. Khi lỗi ứng dụng, quay lại image tương thích schema; khi schema thay đổi không tương thích, dùng forward fix hoặc quy trình restore đã diễn tập. Không xóa volume để rollback.

Audit logs không chứa token, mật khẩu hoặc body request; cần thiết lập retention và giám sát theo môi trường vận hành. Auth limiter là in-memory theo process; khi chạy nhiều replica cần chuyển limiter sang kho dùng chung.
