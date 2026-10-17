# Kế hoạch hợp đồng API

Các route sau là hợp đồng mục tiêu để xây toàn bộ dự án, không phải danh sách endpoint đã triển khai. Base path dự kiến: `/api/v1`.

## Nguyên tắc

UUID cho tài nguyên; ISO 8601 cho timestamp; YYYY-MM-DD cho ngày lưu trú. Tiền là integer kèm currency. Danh sách có pagination với order ổn định; giới hạn page size do server áp dụng.

DTO request tách khỏi model DB. PUT yêu cầu đủ editable fields; PATCH nếu có phải phân biệt trường không gửi với giá trị 0/rỗng. Không cho client ghi owner, role, trạng thái thanh toán hay tổng tiền tùy ý.

## Nhóm endpoint mục tiêu

| Module | Endpoint dự kiến | Quyền |
| --- | --- | --- |
| Identity | POST /auth/register, /auth/login; GET /auth/me | Public / chính người dùng |
| Session | POST /auth/refresh, /auth/logout | Theo cơ chế phiên được chọn |
| Hotel | GET /hotels; GET /hotels/{id} | Public, chỉ published |
| Hotel management | POST /hotels; PUT /hotels/{id}; DELETE /hotels/{id} | Chủ được cấp quyền / admin |
| Media | POST /hotels/{id}/images; DELETE /hotels/{id}/images/{image_id} | Người quản lý khách sạn |
| Room | GET /hotels/{id}/room-types | Public |
| Room management | POST /hotels/{id}/room-types; PUT /room-types/{id}; DELETE /room-types/{id} | Người quản lý khách sạn |
| Inventory | GET/PUT /room-types/{id}/inventory | Người quản lý khách sạn |
| Availability | GET /hotels/{id}/availability | Public |
| Booking | POST /bookings; GET /bookings; GET /bookings/{id}; POST /bookings/{id}/cancel | Khách sở hữu đơn / người quản lý theo chính sách |
| Hotel bookings | GET /hotels/{id}/bookings | Người quản lý khách sạn |
| Payment | POST /bookings/{id}/payments | Khách sở hữu đơn |
| Webhook | POST /payments/webhooks/{provider} | Xác minh chữ ký provider |
| Admin | GET /admin/users; PUT /admin/users/{id}/roles; GET /admin/audit-logs | Admin |

DELETE hotel/room cần định nghĩa archive hay xóa vật lý theo quan hệ với đơn. Không xóa dữ liệu lịch sử đã được tham chiếu.

## Query và payload quan trọng

Hotel search: `destination, check_in, check_out, adults, children, rooms, rank, amenities, page, limit`. Với search theo ngày, phải trả kết quả dựa trên availability thực.

Availability trả room type, sức chứa, số phòng còn lại, nightly prices, tổng tiền và currency; kết quả không tạo hold.

Booking create nhận hotel_id, room_type_id, số phòng/khách, check_in/check_out và thông tin liên hệ cần thiết. Header `Idempotency-Key` bắt buộc; server tính tổng tiền và trạng thái.

Cùng key/cùng payload trả cùng booking. Cùng key/khác payload trả conflict. Nếu API cấp quote, quote phải có thời hạn và backend vẫn kiểm tra lại tồn khi đặt.

## Lỗi mục tiêu

```json
{"error":{"code":"ROOM_UNAVAILABLE","message":"Không còn đủ phòng cho khoảng ngày đã chọn."},"request_id":"..."}
```

Chuẩn hóa lỗi theo một schema và điều chỉnh frontend đồng thời; không đổi schema riêng một module mà không có kế hoạch tương thích.

| HTTP | Ý nghĩa |
| --- | --- |
| 400 | Dữ liệu/query không hợp lệ |
| 401 | Chưa xác thực hoặc phiên hết hạn |
| 403 | Không có quyền |
| 404 | Tài nguyên không tồn tại hoặc bị ẩn theo chính sách |
| 409 | Trùng slug, hết phòng, state conflict hoặc idempotency conflict |
| 429 | Vượt giới hạn request |
| 500 | Lỗi nội bộ; không trả thông tin DB/secrets |

Swagger cần mô tả DTO, security, lỗi và pagination theo hợp đồng cuối cùng. Mỗi nhóm API phải có HTTP test cho success, invalid input, unauthorized, forbidden và conflict phù hợp.
