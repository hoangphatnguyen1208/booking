# Booking frontend

Frontend tiếng Việt dùng Next.js 16, React 19 và TypeScript. Cần Node.js 24.

```powershell
npm ci
npm run dev
```

Mở http://127.0.0.1:5173. Chạy Go backend tại cổng 8080; Next.js chuyển tiếp `/api/v1`, `/healthz`, `/readyz` và `/swagger` đến backend. Copy `.env.example` thành `.env.local` nếu cần thay đổi cấu hình:

- `BACKEND_ORIGIN`: địa chỉ backend trên server, mặc định `http://127.0.0.1:8080`. Rewrite production được xác định khi build; đổi biến này cần build lại.
- `NEXT_PUBLIC_API_BASE_URL`: URL công khai cho browser, mặc định `/api/v1`, được nhúng lúc build. Không đặt secret trong biến `NEXT_PUBLIC_*`.

Pages Router có các file trang riêng cho `/`, `/saved`, `/trips`, `/profile`, `/manage`, `/admin`, `/login`, `/register`, `/hotels/[id]`, `/trips/[id]` và `/manage/hotels/[id]`; đường dẫn không tồn tại trả 404. Link hash cũ như `/#manage` tự chuyển sang `/manage`. URL admin chỉ là đường dẫn UI; backend kiểm tra quyền trên mỗi request.

Phiên đăng nhập được lưu vào localStorage dưới key `booking.session`, gồm access token và thời điểm hết hạn. Sau F5/mở lại trang, frontend đọc phiên còn hạn và gọi `/auth/me` để lấy thông tin user. Đăng xuất được đồng bộ giữa các tab; token hết hạn hoặc API dùng bearer token trả 401 sẽ xóa phiên. Dữ liệu phiên lỗi/hết hạn bị loại bỏ, lỗi mạng không tự xóa phiên. Nếu browser chặn storage, đăng nhập vẫn hoạt động trong bộ nhớ nhưng không giữ sau F5. Chưa có refresh token; JavaScript có thể đọc token trong localStorage, nên cần phòng tránh XSS.

Trang chủ/tìm kiếm và chi tiết khách sạn dùng `getServerSideProps` để lấy dữ liệu công khai từ Go API và render HTML ngay trên server. Bộ lọc và phân trang nằm trong query URL, có thể chia sẻ và tải lại trực tiếp. Nếu API server tạm lỗi, trang có thể thử tải lại qua browser. Chi tiết khách sạn, đăng nhập, đăng ký, chi tiết đơn và quản lý phòng đều có URL riêng.

Layout chung và provider phiên/yêu thích đặt ở `_app.tsx`; mỗi page chỉ tải chức năng của mình. Không còn catch-all `App.tsx` hay dynamic import tắt SSR. Token vẫn ở localStorage nên dữ liệu riêng (hồ sơ, đơn đặt phòng, quản lý, admin) được tải bằng bearer token sau hydration; server không đọc token này. Global CSS và metadata chung ở `_app.tsx`; HTML tiếng Việt ở `_document.tsx`.

```powershell
npm run build
npm run typecheck
npm run lint
npx playwright install chromium
npm test
npm run test:ssr
```

`npm run test:ssr` cần build trước; bài test khởi động API giả lập và Next.js riêng tại cổng 18081/18082, tắt JavaScript để kiểm tra HTML của từng route và dữ liệu công khai. Không dùng dữ liệu VPS.

Chạy bản production bằng `npm run build` rồi `npm run start` (cổng 5173). Để test production build:

```powershell
$env:PLAYWRIGHT_PRODUCTION='1'
npm test
```

Dockerfile bật `NEXT_OUTPUT_STANDALONE=1`, build với target API `http://backend:8080`, copy `.next/standalone`, `.next/static` và `public`, chạy `node server.js` bằng user `node` tại cổng 3000. Compose local vẫn mở http://localhost:8088. Pipeline publish/deploy VPS hiện chỉ phát hành backend, không tự triển khai frontend.

See [the project runbook](../README.md) for configuration, live end-to-end testing and deployment. [The frontend plan](../doc/frontend.md) describes the longer-term design.

