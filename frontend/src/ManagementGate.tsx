import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useBooking } from "./BookingContext";
export default function ManagementGate({
  children,
  hotelId,
  adminOnly = false,
}: {
  children: ReactNode;
  hotelId?: string;
  adminOnly?: boolean;
}) {
  const { session, ready, access, accessError, retryAccess, canManage } =
    useBooking();
  const router = useRouter();
  if (!ready) return <p role="status">Đang kiểm tra quyền truy cập…</p>;
  if (!session)
    return (
      <div className="empty-state">
        <h2>Khu vực dành cho đội ngũ khách sạn</h2>
        <p>Đăng nhập bằng tài khoản đã được cấp quyền.</p>
        <Link
          className="primary"
          href={{ pathname: "/login", query: { next: router.asPath } }}
        >
          Đăng nhập →
        </Link>
      </div>
    );
  if (accessError)
    return (
      <div className="empty-state">
        <p role="alert">{accessError}</p>
        <button onClick={retryAccess}>Thử lại</button>
      </div>
    );
  if (!access) return <p role="status">Đang kiểm tra quyền truy cập…</p>;
  const allowed = adminOnly
    ? access.admin
    : hotelId
      ? access.admin || access.hotels.some((h) => h.hotel_id === hotelId)
      : canManage;
  if (!allowed)
    return (
      <div className="empty-state">
        <h2>Bạn chưa được cấp quyền quản lý</h2>
        <p>
          Liên hệ quản trị viên để được phân công khách sạn. Bạn vẫn có thể khám
          phá và đặt phòng.
        </p>
        <Link className="primary" href="/">
          Khám phá nơi ở →
        </Link>
      </div>
    );
  return <>{children}</>;
}
