# Kế hoạch sản phẩm và nghiệp vụ

## Người dùng và quyền

| Vai trò | Nhu cầu | Phạm vi quyền |
| --- | --- | --- |
| Khách chưa đăng nhập | Tìm kiếm, xem khách sạn/phòng/giá | Chỉ đọc dữ liệu được công bố |
| Khách hàng | Đặt phòng, xem/hủy đơn của mình, quản lý hồ sơ | Không được truy cập đơn người khác |
| Chủ khách sạn | Quản lý khách sạn, loại phòng, giá, tồn kho và đơn | Chỉ các khách sạn được gán quyền |
| Quản trị viên | Quản lý người dùng, cấp quyền và kiểm duyệt khách sạn | Toàn hệ thống; thao tác quan trọng có audit log |

Mọi kiểm tra quyền phải thực hiện ở backend. Việc ẩn nút trên frontend chỉ giúp trải nghiệm, không thay thế kiểm tra quyền.

## Phạm vi MVP

- Đăng ký, đăng nhập, đăng xuất, hồ sơ và phân quyền.
- Danh sách/tìm kiếm khách sạn theo điểm đến, ngày, số khách; phân trang.
- Chi tiết khách sạn: thông tin, ảnh, tiện nghi và loại phòng.
- Loại phòng: sức chứa, số lượng phòng, giá theo ngày và tồn kho.
- Tạo đơn đặt phòng, xác nhận đơn, xem lịch sử/chi tiết và hủy theo chính sách.
- Quản lý khách sạn, phòng, giá/tồn kho và đơn cho chủ khách sạn.
- Công cụ quản trị để cấp quyền và quản lý dữ liệu.
- Thanh toán tại khách sạn; không thu tiền trực tuyến trong MVP.

Chưa đưa vào MVP: đặt nhiều khách sạn trong một đơn, nhiều tiền tệ trong một đơn, gợi ý cá nhân hóa, loyalty và đồng bộ với hệ thống bên ngoài.

## Luồng đặt phòng

1. Khách chọn điểm đến, ngày nhận/trả phòng, số người và số phòng.
2. Hệ thống trả các loại phòng có đủ tồn kho cho toàn bộ đêm lưu trú.
3. Khách xem giá và chính sách; đăng nhập trước khi gửi đơn.
4. Backend kiểm tra lại giá, sức chứa và tồn kho trong transaction.
5. Đơn được tạo và tồn phòng được cập nhật nguyên tử; xác nhận chỉ sau khi transaction thành công.
6. Khách xem đơn bằng mã đặt phòng; chủ khách sạn thấy đơn trong phạm vi mình quản lý.

Kết quả tìm kiếm không giữ phòng. Nếu phòng hết trước khi gửi đơn, trả lỗi xung đột và yêu cầu khách chọn lại.

## Quy tắc phòng và giá

- Khoảng lưu trú là `[check_in, check_out)`: ngày trả phòng không tiêu thụ tồn kho.
- `check_out > check_in`; số khách và số phòng phải dương, không vượt sức chứa.
- Tồn phòng được tính theo loại phòng và từng ngày, không chỉ theo ngày nhận phòng.
- Giá cuối cùng do backend tính từ từng đêm, số phòng và các khoản phí đã định nghĩa.
- Không dùng số thực để tính tiền. Lưu tổng và giá từng đêm cùng đơn.
- Chính sách hủy được chụp lại khi tạo đơn; thay đổi chính sách khách sạn không thay đổi đơn cũ.
- Khách sạn/loại phòng đã có đơn không xóa lịch sử; dùng trạng thái ngừng bán/lưu trữ.

## Trạng thái đơn mục tiêu

MVP: `confirmed → cancelled` hoặc `confirmed → completed`. Đơn mới được xác nhận ngay theo phương án thanh toán tại khách sạn.

Khi thêm thanh toán trực tuyến: `pending_payment → confirmed | expired | cancelled`. Không cho phép chuyển trạng thái tùy ý. Giải phóng tồn kho đúng một lần khi hủy/hết hạn; đơn đã hoàn thành không hủy.

Trạng thái thanh toán tách khỏi trạng thái đặt phòng: `unpaid, paid, refund_pending, refunded, failed`. Không suy ra “đã thanh toán” chỉ từ việc đơn được xác nhận.

## Tiêu chí chấp nhận MVP

- Hai yêu cầu đồng thời cho phòng cuối cùng chỉ tối đa một yêu cầu thành công.
- Gửi lại cùng một yêu cầu tạo đơn không tạo thêm đơn.
- Khách A không đọc/hủy được đơn của khách B.
- Chủ khách sạn A không sửa dữ liệu hoặc xử lý đơn của khách sạn B.
- Hủy đơn hợp lệ trả tồn phòng đúng một lần.
- Thay đổi giá/phòng không làm thay đổi dữ liệu lịch sử của đơn.
- Toàn bộ luồng sử dụng được trên mobile và có thông báo lỗi rõ ràng.
