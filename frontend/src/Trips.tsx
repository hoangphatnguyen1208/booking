import Link from "next/link";
import { useEffect, useState } from "react";
import { bookingApi, money, dateLabel } from "./booking-api";
import type { Booking } from "./booking-api";
export default function Trips({
  token,
  onLogin,
}: {
  token: string | null;
  onLogin: () => void;
}) {
  const [items, setItems] = useState<Booking[]>([]),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!token) return;
    const c = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const rows = await bookingApi.bookings(token!, page, c.signal);
        if (!c.signal.aborted) setItems(rows);
      } catch (err) {
        if (!c.signal.aborted)
          setError(err instanceof Error ? err.message : "Không tải được đơn");
      } finally {
        if (!c.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => c.abort();
  }, [token, page, refresh]);
  if (!token)
    return (
      <div className="empty-state">
        <h1>Chuyến đi của tôi</h1>
        <p>Đăng nhập để xem và quản lý đơn đặt phòng.</p>
        <button className="primary" onClick={onLogin}>
          Đăng nhập →
        </button>
      </div>
    );
  return (
    <section className="management-page">
      <header className="page-heading">
        <div>
          <h1>Chuyến đi của tôi</h1>
          <p>Theo dõi đặt phòng và thông tin lưu trú của bạn.</p>
        </div>
      </header>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải chuyến đi…</p>
      ) : (
        <>
          {items.length === 0 && <p>Chưa có đơn đặt phòng.</p>}
          <div className="management-list">
            {items.map((item) => (
              <article key={item.id}>
                <div>
                  <strong>
                    {item.hotel_name} · {item.room_name}
                  </strong>
                  <p>
                    {dateLabel(item.check_in)} – {dateLabel(item.check_out)} ·{" "}
                    {item.rooms} phòng · {money(item.total)}
                  </p>
                  <p>
                    {item.status === "cancelled"
                      ? "Đã hủy"
                      : item.status === "completed"
                        ? "Đã hoàn thành"
                        : "Đã xác nhận"}{" "}
                    · Thanh toán tại khách sạn
                  </p>
                </div>
                <Link className="outline" href={`/trips/${item.id}`}>
                  Chi tiết đơn {item.id.slice(0, 8)}
                </Link>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={page === 1 || loading}
              className="outline"
              onClick={() => setPage((n) => n - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page}</span>
            <button
              className="outline"
              disabled={items.length < 20 || loading}
              onClick={() => setPage((n) => n + 1)}
            >
              Trang sau
            </button>
            <button
              className="outline"
              onClick={() => setRefresh((n) => n + 1)}
            >
              Thử tải lại
            </button>
          </div>
        </>
      )}
    </section>
  );
}
