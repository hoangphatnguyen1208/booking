import Link from "next/link";
import { useBooking } from "./BookingContext";

const currentYear = new Date().getFullYear();

export default function Footer() {
  const { session } = useBooking();
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-intro">
          <Link
            className="footer-brand"
            href="/"
            aria-label="booking. — Trang chủ"
          >
            booking<span>.</span>
          </Link>
          <p>
            Một nơi dừng chân.
            <br />
            Một hành trình đáng nhớ.
          </p>
          <small>
            Tìm khách sạn, chọn phòng và quản lý chuyến đi trong cùng một không
            gian.
          </small>
        </div>
        <nav aria-label="Khám phá ở footer">
          <h2>Chuyến đi của bạn</h2>
          <Link href="/">Khám phá nơi ở</Link>
          {session && <Link href="/saved">Những nơi đã lưu</Link>}
          <Link href="/trips">Đặt phòng của tôi</Link>
        </nav>
        <nav aria-label="Tài khoản ở footer">
          <h2>Cùng booking.</h2>
          <Link href="/profile">Tài khoản của bạn</Link>
          <Link href="/manage">Quản lý khách sạn</Link>
          <a href="https://unsplash.com" target="_blank" rel="noreferrer">
            Ảnh từ Unsplash ↗
          </a>
        </nav>
        <div className="footer-note">
          <span aria-hidden="true">⌂</span>
          <h2>An tâm lên kế hoạch</h2>
          <p>
            Thanh toán tại khách sạn. Xem giá, phòng trống và điều kiện hủy
            trước khi xác nhận.
          </p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {currentYear} booking.</span>
        <span>Việt Nam · Tiếng Việt · VND</span>
        <small>Ảnh mẫu mang tính minh họa cho dữ liệu demo.</small>
      </div>
    </footer>
  );
}
