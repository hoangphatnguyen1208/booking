# Kế hoạch xây dựng backend

## Mục tiêu

Hoàn thiện API cho toàn bộ luồng tìm khách sạn, quản lý phòng/tồn kho, đặt/hủy phòng và quản trị. Dùng cấu trúc controller → service → repository; giữ Go, Gin, GORM và PostgreSQL làm nền tảng.

## 1. Nền tảng và identity

- Chuẩn hóa cấu hình, kiểm tra cấu hình bắt buộc khi khởi động và quản lý secrets theo môi trường.
- Đăng ký, đăng nhập, hồ sơ; validation email/mật khẩu và lỗi nghiệp vụ rõ ràng.
- JWT middleware; phân quyền admin/chủ khách sạn/khách hàng và kiểm tra ownership theo DB.
- Thiết kế phiên đăng nhập dài hạn: refresh-token rotation, thu hồi phiên và logout nếu chọn hỗ trợ.
- Giới hạn tốc độ đăng nhập, tránh ghi mật khẩu/token vào log.
- Chuẩn hóa lỗi, request ID, logging, health/readiness và timeout.

Đầu ra: khách không thể tự cấp quyền; token sai/hết hạn bị từ chối; ownership được test qua API.

## 2. Hotel và nội dung

- CRUD khách sạn, trạng thái draft/published/archived và slug duy nhất.
- Tìm kiếm server-side theo điểm đến, phân trang ổn định, bộ lọc hạng sao/tiện nghi.
- Phân quyền viết theo hotel_members; public chỉ đọc khách sạn published.
- Ảnh, ảnh đại diện, tiện nghi; validation upload và kiểm tra quyền.
- PUT thay toàn bộ editable fields; chỉ thêm PATCH khi có DTO phân biệt omitted với zero value.
- Quy định lưu trữ thay vì xóa khách sạn khi đã có đơn.

Đầu ra: frontend có thể tìm trên toàn bộ dữ liệu, không chỉ lọc trang hiện tại.

## 3. Room, inventory và pricing

- CRUD loại phòng, sức chứa, số lượng và trạng thái bán.
- Thiết lập tồn kho và giá theo khoảng ngày; kiểm tra capacity không thấp hơn lượng đã đặt.
- API availability kiểm tra đủ toàn bộ đêm lưu trú.
- Xác định currency và đơn vị tiền; validation số tiền không âm.
- Không cho sửa giảm tồn làm mất khả năng đáp ứng các đơn đã xác nhận.

Đầu ra: query availability đúng cho nhiều đêm, nhiều phòng, ngày thiếu tồn và loại phòng ngừng bán.

## 4. Booking MVP

- Tạo booking có Idempotency-Key và request hash.
- Transaction khóa tồn kho, tính giá, chụp dữ liệu lịch sử và xác nhận đơn.
- API danh sách/chi tiết của khách; danh sách theo khách sạn cho người quản lý.
- Hủy theo chính sách với transaction và trả tồn đúng một lần.
- Kiểm soát state transition; cập nhật completed theo quy trình đã thống nhất.
- Lỗi nghiệp vụ: hết phòng, giá thay đổi, không đủ quyền, quá hạn hủy.

Đầu ra: đặt đồng thời không oversell; retry không tạo trùng; rollback không để đơn hoặc tồn dang dở.

## 5. Thanh toán trực tuyến — sau MVP

- Chọn nhà cung cấp và thiết kế payment adapter sau khi chốt yêu cầu.
- Giữ phòng có thời hạn; worker giải phóng hold hết hạn.
- Webhook xác minh chữ ký, idempotency và số tiền/currency.
- Không xác nhận thanh toán bằng thông báo thành công từ trình duyệt.
- Xử lý webhook trễ, thanh toán sau khi hold hết hạn và retry worker.
- Hoàn tiền, reconciliation và audit giao dịch.

Đầu ra: webhook lặp không thu/hoàn tiền hoặc chuyển trạng thái hai lần.

## 6. Thông báo, quản trị và vận hành

- Gửi xác nhận/hủy qua job sau commit; retry có giới hạn và theo dõi thất bại.
- Audit cấp quyền, thay đổi tồn/giá và xử lý đơn.
- Migration có phiên bản, CI, deployment staging/production.
- Metrics lỗi/latency, cảnh báo, backup và kiểm tra restore.
- Reverse proxy, TLS, CORS và giới hạn request theo môi trường.

## Chiến lược kiểm thử

| Loại test | Tình huống bắt buộc |
| --- | --- |
| Unit/service | Validation, chính sách hủy, giá và state transition |
| Repository | Missing row, unique conflict, giá trị 0/rỗng, request cancellation |
| PostgreSQL integration | Transaction rollback, RETURNING, row lock và concurrent booking |
| HTTP | Status code, auth, ownership, payload và pagination |
| End-to-end | Tìm → đặt → xem → hủy; luồng quản lý và lỗi hết phòng |

SQL mock chỉ kiểm chứng tương tác/query; phải có PostgreSQL thật để kiểm chứng khóa, constraint và đồng thời. Không đánh dấu booking hoàn thành chỉ vì test mock qua.

## Tiêu chí hoàn thành backend

Hợp đồng API được cập nhật, migration chạy trên môi trường sạch và có dữ liệu, test trọng yếu qua, quyền được kiểm tra ở backend, và các endpoint tích hợp được với frontend trên staging.
