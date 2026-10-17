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
    [refresh, setRefresh] = useState(0),
    [selected, setSelected] = useState<Booking | null>(null),
    [busy, setBusy] = useState(false);
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
  async function detail(item: Booking) {
    if (!token) return;
    setBusy(true);
    setError("");
    try {
      setSelected(await bookingApi.detail(token, item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tải được chi tiết");
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!token || !selected) return;
    setBusy(true);
    setError("");
    try {
      const item = await bookingApi.cancel(token, selected.id);
      setSelected(item);
      setRefresh((n) => n + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được đơn");
    } finally {
      setBusy(false);
    }
  }
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
    <section>
      <h1>Chuyến đi của tôi</h1>
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
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => void detail(item)}
                >
                  Chi tiết đơn {item.id.slice(0, 8)}
                </button>
              </article>
            ))}
          </div>
          <div className="pagination">
            <button
              disabled={page === 1 || busy}
              className="outline"
              onClick={() => setPage((n) => n - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page}</span>
            <button
              className="outline"
              disabled={items.length < 20 || busy}
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
      {selected && (
        <section className="profile-card">
          <h2>Chi tiết đơn</h2>
          <p>Mã đơn: {selected.id}</p>
          <p>
            {selected.guest_name} · {selected.phone}
          </p>
          <p>
            {selected.hotel_name} · {selected.room_name}
          </p>
          <p>
            {dateLabel(selected.check_in)} – {dateLabel(selected.check_out)} ·{" "}
            {money(selected.total)}
          </p>
          <p>
            Hạn hủy miễn phí:{" "}
            {new Date(selected.cancel_before).toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
            })}{" "}
            (giờ Việt Nam)
          </p>
          <p>
            Trạng thái:{" "}
            {selected.status === "cancelled"
              ? "Đã hủy"
              : selected.status === "completed"
                ? "Đã hoàn thành"
                : "Đã xác nhận"}
          </p>
          {selected.status === "confirmed" && true && (
            <>
              <p>
                Hủy đơn sẽ giải phóng phòng đã đặt. Xác nhận nếu bạn muốn tiếp
                tục.
              </p>
              <button
                className="primary"
                disabled={busy}
                onClick={() => void cancel()}
              >
                Xác nhận hủy đơn
              </button>
            </>
          )}
          <button
            className="outline"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            Đóng chi tiết
          </button>
        </section>
      )}
    </section>
  );
}
