# Lộ trình triển khai toàn dự án

Đây là thứ tự công việc theo phụ thuộc, không phải lịch cam kết hoặc báo cáo tiến độ hiện tại. Chỉ đánh dấu hoàn thành sau khi đáp ứng tiêu chí kiểm chứng.

| Giai đoạn | Backend | Frontend | Tiêu chí qua giai đoạn |
| --- | --- | --- | --- |
| 0. Chốt thiết kế | Vai trò, tiền, ngày, chính sách và schema | Luồng màn hình và hợp đồng dữ liệu | Quyết định MVP được ghi rõ |
| 1. Nền tảng | Identity, ownership, migration, lỗi, CI | Auth, layout, routing, API client | Kiểm tra quyền và phiên qua |
| 2. Khách sạn | Hotel search/detail/management, ảnh, tiện nghi | Search, detail, favorites, quản lý hotel | Dữ liệu thật; search toàn hệ thống |
| 3. Phòng và tồn kho | Room types, inventory, pricing, availability | Chọn phòng và lịch quản lý giá/tồn | Kết quả đúng cho nhiều đêm/phòng |
| 4. Booking MVP | Tạo/hủy đơn, transaction, idempotency, snapshot | Checkout, xác nhận, lịch sử, hủy | Không oversell; retry/hủy đúng một lần |
| 5. Quản trị và staging | Cấp quyền, audit, quan sát, backup | Admin và dashboard quản lý | E2E PostgreSQL thật; kiểm tra restore |
| 6. Phát hành MVP | Production migration, deployment, rollback | Production build, kiểm tra mobile | Luồng chính chạy ổn và có runbook |
| 7. Mở rộng | Payment, webhook, worker, notification | Thanh toán và trạng thái giao dịch | Retry/webhook/hết hạn hold đúng |
| 8. Cải tiến | Reviews, promotion, favorites đồng bộ | Đánh giá, ưu đãi và trải nghiệm bổ sung | Quy tắc mới không phá booking lõi |

## Checklist triển khai theo module

- [ ] Chốt use case, quyền và các trường hợp thất bại.
- [ ] Chốt DTO/API và thay đổi dữ liệu.
- [ ] Viết migration và nghiệp vụ backend.
- [ ] Kiểm thử lỗi, quyền và transaction liên quan.
- [ ] Tích hợp frontend với loading/empty/error/retry.
- [ ] Chạy luồng thật trên staging.
- [ ] Cập nhật hợp đồng và runbook khi phát hành.

## Cổng phát hành MVP

- [ ] Tìm kiếm và availability theo ngày/số khách/số phòng.
- [ ] Giá do backend tính và lưu snapshot.
- [ ] Concurrent booking không vượt tồn.
- [ ] Idempotency xử lý retry/timeout.
- [ ] Ownership và role checks cho mọi API ghi/đọc dữ liệu riêng.
- [ ] Hủy đơn đúng chính sách và giải phóng tồn một lần.
- [ ] Không xóa lịch sử đơn khi ngừng bán khách sạn/phòng.
- [ ] Frontend không hiển thị giá, ảnh hoặc trạng thái giả như dữ liệu thật.
- [ ] Migration, backup/restore và rollback deployment được kiểm tra.
- [ ] Log/metrics không lộ thông tin nhạy cảm; lỗi vận hành có cảnh báo.

## Rủi ro cần xử lý sớm

| Rủi ro | Hướng xử lý |
| --- | --- |
| Bán vượt tồn do request đồng thời | Transaction, row lock/conditional update và test PostgreSQL concurrency |
| Mọi tài khoản đều quản lý được khách sạn | Ownership/roles trước khi mở quản lý công khai |
| Đơn thay đổi khi giá/chính sách thay đổi | Snapshot tại thời điểm đặt |
| Sai số tiền hoặc lệch ngày | Integer currency units, DATE và timezone khách sạn |
| Tạo trùng sau timeout | Idempotency key và tra cứu kết quả |
| Hủy/worker/webhook giải phóng tồn nhiều lần | State transition nguyên tử, khóa và idempotency |
| FE/BE hiểu hợp đồng khác nhau | DTO/Swagger thống nhất và test tích hợp |
| Migration hoặc deployment lỗi | Staging, backup và quy trình rollback/forward fix |

Không đặt ngày hoàn thành khi chưa biết thời lượng làm việc và nguồn lực. Sau khi chốt phạm vi, chia mỗi giai đoạn thành issue nhỏ với phụ thuộc, đầu ra và tiêu chí nghiệm thu.
