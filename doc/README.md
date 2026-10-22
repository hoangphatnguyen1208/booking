# Kế hoạch phát triển dự án Booking

Thư mục này là bản kế hoạch cho toàn bộ hệ thống đặt phòng khách sạn: mục tiêu sản phẩm, nghiệp vụ, kiến trúc, dữ liệu, backend, frontend và lộ trình triển khai. Các mô tả bên dưới là thiết kế mục tiêu và công việc cần thực hiện; không phải báo cáo những tính năng đã có.

## Đọc kế hoạch

| Tài liệu | Nội dung |
| --- | --- |
| [Phạm vi sản phẩm](product.md) | Người dùng, luồng nghiệp vụ, quy tắc đặt/hủy phòng và giới hạn MVP |
| [Kiến trúc và dữ liệu](architecture.md) | Các module, mô hình dữ liệu, tồn phòng, tiền và thời gian |
| [Kế hoạch backend](backend.md) | Công việc theo module, transaction, bảo mật và kiểm thử |
| [Kế hoạch frontend](frontend.md) | Màn hình, trạng thái, tích hợp API và kiểm thử giao diện |
| [Kế hoạch API](api-plan.md) | Hợp đồng API dự kiến và quyền truy cập |
| [Lộ trình triển khai](roadmap.md) | Thứ tự phụ thuộc, đầu ra và tiêu chí hoàn thành từng giai đoạn |

## Định hướng

Xây dựng hệ thống cho khách tìm khách sạn, kiểm tra phòng theo ngày và số khách, đặt phòng, xem và hủy đơn; chủ khách sạn quản lý cơ sở của mình; quản trị viên quản lý toàn hệ thống.

Tiếp tục dùng Go/Gin/GORM/PostgreSQL cho backend và Next.js/React/TypeScript cho frontend. Triển khai theo kiến trúc monolith chia module để hoàn thành nghiệp vụ trước khi cân nhắc tách dịch vụ.

MVP tập trung vào đặt phòng có tồn kho chính xác và thanh toán tại khách sạn. Thanh toán trực tuyến, đánh giá, khuyến mãi và thông báo tự động là các giai đoạn tiếp theo.

## Những quyết định cần chốt trước khi xây module tương ứng

- Danh mục vai trò và cách cấp quyền chủ khách sạn.
- Tiền tệ của từng khách sạn; tiền tệ mặc định của MVP.
- Chính sách hủy, hạn hủy và phí hủy.
- Đặt phòng tại khách sạn được xác nhận ngay hay cần chủ khách sạn duyệt.
- Thời hạn giữ phòng nếu bổ sung thanh toán trực tuyến.
- Nguồn lưu ảnh và môi trường triển khai.

Các tài liệu đưa ra phương án mặc định để triển khai: tồn kho theo loại phòng/ngày, xác nhận ngay cho thanh toán tại khách sạn, và chính sách hủy được lưu cùng đơn. Những quyết định trên cần được xác nhận trước khi phát hành tính năng liên quan.

## Định nghĩa hoàn thành

Một module hoàn thành khi có quy tắc nghiệp vụ và hợp đồng API rõ ràng, backend kiểm tra quyền và dữ liệu, frontend tích hợp đầy đủ trạng thái, test kiểm chứng tình huống quan trọng và dữ liệu thực được xác minh trên PostgreSQL.

Một bản phát hành hoàn thành khi toàn bộ luồng tìm phòng → đặt → xem đơn → hủy hoạt động, không bán vượt tồn phòng khi đặt đồng thời, có migration và phương án vận hành/khôi phục dữ liệu.
