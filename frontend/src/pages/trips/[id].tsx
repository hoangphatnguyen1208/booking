import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useBooking } from "../../BookingContext";
import { bookingApi, money, dateLabel } from "../../booking-api";
import type { Booking } from "../../booking-api";
export default function TripDetail() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { session, ready } = useBooking();
  const token = session?.token;
  const [selected, setSelected] = useState<Booking | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (!id || !token) return;
    const c = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize loading state with the API request.
    setLoading(true);
    setError("");
    bookingApi
      .detail(token, id, c.signal)
      .then((row) => {
        if (!c.signal.aborted) setSelected(row);
      })
      .catch((err) => {
        if (!c.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không tải được chi tiết.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [id, token, reload]);
  async function cancel() {
    if (!token || !selected || busy) return;
    setBusy(true);
    setError("");
    try {
      const item = await bookingApi.cancel(token, selected.id);
      setSelected(item);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không hủy được đơn");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="management-page">
      <Head>
        <title>Chi tiết đơn · booking.</title>
      </Head>
      <h1>Chi tiết đơn</h1>
      {!ready && <p role="status">Đang khôi phục phiên đăng nhập…</p>}
      {ready && !token && (
        <Link
          className="primary"
          href={{ pathname: "/login", query: { next: router.asPath } }}
        >
          Đăng nhập →
        </Link>
      )}
      {ready && token && (
        <>
          {error && (
            <>
              <p role="alert" className="error">
                {error}
              </p>
              <button
                className="outline"
                onClick={() => setReload((n) => n + 1)}
              >
                Thử lại
              </button>
            </>
          )}
          {loading && <p role="status">Đang tải chi tiết…</p>}
          {!loading && selected && (
            <section className="profile-card">
              <p>Mã đơn: {selected.id}</p>
              <p>
                {selected.guest_name} · {selected.phone}
              </p>
              <p>
                {selected.hotel_name} · {selected.room_name}
              </p>
              <p>
                {dateLabel(selected.check_in)} – {dateLabel(selected.check_out)}{" "}
                · {money(selected.total)}
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
              {selected.status === "confirmed" && (
                <>
                  <p>
                    Hủy đơn sẽ giải phóng phòng đã đặt. Xác nhận nếu bạn muốn
                    tiếp tục.
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
              <Link className="outline" href="/trips">
                Quay lại chuyến đi
              </Link>
            </section>
          )}
        </>
      )}
    </section>
  );
}
