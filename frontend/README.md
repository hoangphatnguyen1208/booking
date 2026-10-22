# Booking frontend

Frontend tiếng Việt dùng Next.js 16, React 19 và TypeScript. Cần Node.js 24.

```powershell
npm ci
npm run dev
```

Mở http://127.0.0.1:5173. Chạy Go backend tại cổng 8080; Next.js chuyển tiếp `/api/v1`, `/healthz`, `/readyz` và `/swagger` đến backend. Copy `.env.example` thành `.env.local` nếu cần thay đổi cấu hình:

- `BACKEND_ORIGIN`: địa chỉ backend trên server, mặc định `http://127.0.0.1:8080`. Rewrite production được xác định khi build; đổi biến này cần build lại.
- `NEXT_PUBLIC_API_BASE_URL`: URL công khai cho browser, mặc định `/api/v1`, được nhúng lúc build. Không đặt secret trong biến `NEXT_PUBLIC_*`.

Pages Router sinh sẵn các route `/`, `/saved`, `/trips`, `/profile`, `/manage`, `/admin`; đường dẫn ngoài danh sách trả 404. Link hash cũ như `/#manage` tự chuyển sang `/manage`. URL admin chỉ là đường dẫn UI; backend kiểm tra quyền trên mỗi request.

Phiên đăng nhập được lưu vào localStorage dưới key `booking.session`, gồm access token và thời điểm hết hạn. Sau F5/mở lại trang, frontend đọc phiên còn hạn và gọi `/auth/me` để lấy thông tin user. Đăng xuất được đồng bộ giữa các tab; token hết hạn hoặc API dùng bearer token trả 401 sẽ xóa phiên. Dữ liệu phiên lỗi/hết hạn bị loại bỏ, lỗi mạng không tự xóa phiên. Nếu browser chặn storage, đăng nhập vẫn hoạt động trong bộ nhớ nhưng không giữ sau F5. Chưa có refresh token; JavaScript có thể đọc token trong localStorage, nên cần phòng tránh XSS.

Các phần tương tác hiện tại (đăng nhập, lưu yêu thích, tìm khách sạn, đặt/hủy, quản lý và admin) chạy phía client qua dynamic import `ssr: false`. Next.js sinh HTML metadata và trạng thái loading; dữ liệu khách sạn được lấy từ Go API trên browser, chưa render bằng SSR. Global CSS và metadata chung được khai báo trong `src/pages/_app.tsx`; HTML tiếng Việt ở `_document.tsx`.

```powershell
npm run build
npm run typecheck
npm run lint
npx playwright install chromium
npm test
```

Chạy bản production bằng `npm run build` rồi `npm run start` (cổng 5173). Để test production build:

```powershell
$env:PLAYWRIGHT_PRODUCTION='1'
npm test
```

Dockerfile bật `NEXT_OUTPUT_STANDALONE=1`, build với target API `http://backend:8080`, copy `.next/standalone`, `.next/static` và `public`, chạy `node server.js` bằng user `node` tại cổng 3000. Compose local vẫn mở http://localhost:8088. Pipeline publish/deploy VPS hiện chỉ phát hành backend, không tự triển khai frontend.

See [the project runbook](../README.md) for configuration, live end-to-end testing and deployment. [The frontend plan](../doc/frontend.md) describes the longer-term design.

