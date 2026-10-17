# Kế hoạch xây dựng frontend

## Mục tiêu và cấu trúc

Dùng React + TypeScript + Vite, giao diện tiếng Việt responsive. Chia code thành API client, kiểu dữ liệu, components dùng chung và features: auth, hotels, rooms, bookings, management, admin.

Tách component màn hình và nghiệp vụ khỏi App khi module mở rộng. Có điều hướng URL để tải lại, chia sẻ và dùng nút back/forward; route guard chỉ hỗ trợ UX, backend vẫn kiểm tra quyền.

## Màn hình khách hàng

| Màn hình | Nội dung mục tiêu | Phụ thuộc backend |
| --- | --- | --- |
| Khám phá/tìm kiếm | Điểm đến, ngày, khách/phòng, filters, phân trang | Hotel search và availability |
| Chi tiết khách sạn | Ảnh, địa chỉ, tiện nghi, hạng sao, loại phòng | Hotel detail và room types |
| Chọn phòng | Sức chứa, số phòng, giá từng đêm và tổng | Availability và pricing |
| Đăng ký/đăng nhập | Form, validation, lỗi, session | Identity |
| Checkout | Thông tin khách, đơn dự kiến, chính sách và xác nhận | Booking create |
| Xác nhận đơn | Mã đơn, ngày, phòng, giá và trạng thái | Booking detail |
| Chuyến đi của tôi | Danh sách, lọc trạng thái, chi tiết, hủy | My bookings và cancellation |
| Đã lưu | Danh sách yêu thích, xử lý khách sạn ngừng bán | Hotel detail; favorites API nếu thêm đồng bộ |
| Hồ sơ | Thông tin người dùng, bảo mật, đăng xuất | Profile và session |

Không hiển thị giá/đánh giá tự tạo khi API thiếu dữ liệu. Phân biệt hạng sao khách sạn với điểm đánh giá khách hàng. Hiển thị rõ nếu chưa có giá hoặc chưa mở bán.

## Màn hình quản lý khách sạn

- Danh sách khách sạn được gán quyền, form tạo/sửa và trạng thái công bố.
- Ảnh, tiện nghi và loại phòng.
- Lịch giá/tồn kho theo ngày; cảnh báo khi giảm capacity dưới lượng đã đặt.
- Danh sách đơn, lọc theo ngày/trạng thái và chi tiết khách.
- Xác nhận trước các thao tác hủy/xóa/lưu trữ có tác động.
- Xử lý 401/403/404/409; không hiển thị thành công khi backend từ chối.

## Màn hình quản trị

- Người dùng và vai trò; cấp/thu hồi quyền chủ khách sạn.
- Kiểm duyệt và trạng thái khách sạn.
- Danh sách đơn theo phạm vi được phép, audit log và chỉ số vận hành.
- Không triển khai quản trị chỉ bằng việc ẩn/hiện nút theo localStorage.

## Tích hợp dữ liệu

- API base URL theo môi trường; development proxy và production reverse proxy.
- Client typed, timeout/cancellation, parse lỗi và xử lý session hết hạn.
- Search/filter trên server, đồng bộ query vào URL.
- Cache và invalidation sau tạo/sửa/hủy; không để dữ liệu cũ báo thành công.
- Favorites local ở MVP; dùng UUID, xử lý bản ghi bị xóa và xác định cách đồng bộ khi nâng cấp.
- Idempotency key cho gửi đơn; giữ nguyên key khi retry cùng payload.
- Sau lỗi timeout tạo đơn, kiểm tra trạng thái theo key trước khi gửi đơn mới.
- Giá checkout được backend xác nhận lại; nếu thay đổi, yêu cầu khách duyệt lại trước khi đặt.

## UX và accessibility

Mỗi màn hình có loading, empty, error, retry và success state. Form giữ dữ liệu khi lỗi; tránh submit lặp; thông báo tại đúng màn hình. Modal quản lý focus, Escape và khôi phục focus.

Hỗ trợ bàn phím, label cho input, thông báo screen reader, tương phản dễ đọc, touch target phù hợp và reduced motion. Kiểm tra bố cục mobile/tablet/desktop và nội dung dài.

## Kiểm thử

- Form đăng ký/đăng nhập, token hết hạn, retry và quyền truy cập.
- Search, pagination, empty result, ảnh lỗi và hotel detail 404.
- CRUD hotel/room với conflict và forbidden.
- Checkout: validation, giá thay đổi, hết phòng, submit lặp và timeout.
- Lịch sử/hủy đơn: quá hạn, lỗi mạng, trạng thái sau hủy.
- Test desktop/mobile với API mock; thêm luồng end-to-end với backend/PostgreSQL thật trên staging.

## Tiêu chí hoàn thành frontend

Không còn dùng dữ liệu minh họa cho tính năng đã mở; toàn bộ luồng MVP tích hợp API, URL điều hướng đúng, trạng thái lỗi đầy đủ, build/lint/test qua và luồng chính được kiểm chứng trên staging.
