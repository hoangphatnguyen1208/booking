# Kế hoạch kiến trúc và dữ liệu

## Kiến trúc mục tiêu

```text
Frontend Next.js/React
    → API Gin /api/v1
        → Middleware: xác thực, quyền, request ID
        → Controller: bind DTO, HTTP response
        → Service: nghiệp vụ, transaction
        → Repository: truy vấn PostgreSQL
    → Storage ảnh (giai đoạn media)
    → Worker tác vụ nền (giai đoạn thanh toán/thông báo)
```

Giữ monolith chia module: identity, hotel, room, inventory, booking, payment, notification và administration. Chỉ bổ sung module khi đến giai đoạn tương ứng.

Controller không truy vấn DB trực tiếp; repository không quyết định HTTP status; service chuyển lỗi lưu trữ thành lỗi nghiệp vụ khi cần.

## Mô hình dữ liệu dự kiến

| Bảng | Trường/chức năng chính | Ràng buộc quan trọng |
| --- | --- | --- |
| users | UUID, email, password hash, trạng thái | Email duy nhất |
| user_roles | Vai trò hệ thống | Không tự cấp admin qua đăng ký |
| hotel_members | user_id, hotel_id, quyền quản lý | Cặp người dùng/khách sạn duy nhất |
| hotels | UUID, slug, tên, địa chỉ, thành phố, quốc gia, timezone, currency, trạng thái | Slug duy nhất; hạng sao 0–5 |
| hotel_images | URL/storage key, thứ tự, ảnh đại diện | Thuộc một khách sạn |
| amenities / hotel_amenities | Tiện nghi và liên kết | Không liên kết trùng |
| room_types | hotel_id, tên, sức chứa, tổng số phòng, trạng thái | Số lượng và sức chứa hợp lệ |
| room_inventory | room_type_id, stay_date, capacity, reserved, nightly_price | Duy nhất loại phòng/ngày; 0 ≤ reserved ≤ capacity |
| bookings | Mã đơn, user_id, hotel_id, ngày, trạng thái, currency, tổng tiền, chính sách | Mã đơn duy nhất |
| booking_items | room_type_id, số phòng, khách và snapshot tên phòng | Thuộc một đơn |
| booking_nights | item_id, ngày, số phòng, giá đêm được chụp lại | Dữ liệu lịch sử không phụ thuộc giá hiện tại |
| idempotency_keys | actor, key, request hash, booking_id | Duy nhất theo actor/key |
| payments | booking_id, provider reference, số tiền, trạng thái | Mã giao dịch duy nhất |
| webhook_events | provider, event_id, kết quả xử lý | Không xử lý sự kiện trùng |
| audit_logs | actor, hành động, đối tượng, thời điểm | Không ghi token/mật khẩu |

Booking MVP chỉ thuộc một khách sạn. Có thể có nhiều loại phòng trong cùng khách sạn nếu luồng MVP chọn hỗ trợ; nếu chưa hỗ trợ, giới hạn một booking item ngay trong validation.

## Transaction chống bán vượt phòng

1. Xác định tất cả dòng tồn kho của loại phòng trong khoảng lưu trú.
2. Khóa dòng theo thứ tự loại phòng/ngày thống nhất để hạn chế deadlock.
3. Kiểm tra đầy đủ số đêm, trạng thái bán, sức chứa và tồn còn lại.
4. Tính tiền từ giá DB; lưu booking, booking items và snapshot từng đêm.
5. Tăng `reserved` trên tất cả ngày và lưu idempotency key trong cùng transaction.
6. Commit; nếu bất kỳ bước nào thất bại thì rollback toàn bộ.

Dùng row lock hoặc cập nhật có điều kiện với kiểm tra RowsAffected; không dùng riêng thao tác “đọc tồn rồi ghi” ngoài transaction. Thiếu dòng tồn kho nghĩa là chưa mở bán, không tự coi là còn phòng.

Hủy đơn khóa booking, kiểm tra trạng thái hiện tại rồi giảm tồn trong cùng transaction. Yêu cầu hủy lặp phải không làm giảm tồn lần nữa.

## Tiền, ngày và thời gian

- Dùng số nguyên theo đơn vị nhỏ nhất của currency; ghi currency cùng số tiền.
- Ngày lưu trú dùng kiểu DATE theo timezone khách sạn.
- Thời điểm tạo/hủy/hết hạn dùng TIMESTAMPTZ, trao đổi API bằng ISO 8601.
- Hạn hủy được chuyển thành thời điểm xác định khi đặt phòng.
- Frontend chỉ hiển thị; backend xác nhận lại mọi giá, hạn hủy và số lượng.

## Migration và vận hành dữ liệu

Chuyển sang migration có phiên bản cho môi trường triển khai. Mỗi thay đổi schema có kiểm tra tương thích dữ liệu và kế hoạch rollback/forward fix; không dựa riêng vào AutoMigrate khi phát hành.

Thêm index cho hotel slug, hotel_members, room_inventory theo loại phòng/ngày, bookings theo user/trạng thái và hotel/ngày. Kiểm tra query plan trước khi tối ưu thêm.

Có seed riêng cho development/test, backup tự động và diễn tập khôi phục. Không đưa dữ liệu khách hoặc secrets vào repository.
