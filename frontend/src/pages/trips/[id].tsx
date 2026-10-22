import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { useBooking } from "../../BookingContext";
import { bookingApi, money, dateLabel } from "../../booking-api";
import RoomPhoto from "../../RoomPhoto";
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
  const statusLabel =
    selected?.status === "cancelled"
      ? "Đã hủy"
      : selected?.status === "completed"
        ? "Đã hoàn thành"
        : selected?.status === "confirmed"
          ? "Đã xác nhận"
          : "Chưa xác định";
  const nights = selected
    ? Math.max(
        0,
        Math.round(
          (Date.parse(selected.check_out) - Date.parse(selected.check_in)) /
            86400000,
        ),
      )
    : 0;
  return (
    <section className="trip-detail-page">
      <Head>
        <title>Chi tiết đơn · booking.</title>
      </Head>
      <Link className="trip-back" href="/trips">
        ← Quay lại chuyến đi
      </Link>
      <header className="page-heading trip-heading">
        <div>
          <h1>Chi tiết đơn</h1>
          <p>Thông tin đặt phòng và lưu trú của bạn.</p>
        </div>
        {!loading && selected && token && (
          <span className={`trip-status trip-status-${selected.status}`}>
            Trạng thái: {statusLabel}
          </span>
        )}
      </header>
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
            <div className="trip-error">
              <p role="alert" className="error">
                {error}
              </p>
              <button
                className="outline"
                onClick={() => setReload((n) => n + 1)}
                disabled={busy}
              >
                Thử lại
              </button>
            </div>
          )}
          {loading && (
            <div className="trip-card" role="status">
              Đang tải chi tiết…
            </div>
          )}
          {!loading && selected && (
            <>
              <p className="trip-reference">
                Mã đặt phòng <span>{selected.id}</span>
              </p>
              <div className="trip-detail-grid">
                <div className="trip-main">
                  <article className="trip-property-card trip-card">
                    <RoomPhoto
                      key={selected.room_image_url}
                      src={selected.room_image_url}
                      name={selected.room_name}
                    />
                    <div className="trip-property-content">
                      <span className="trip-label">PHÒNG ĐÃ ĐẶT</span>
                      <h2>{selected.hotel_name}</h2>
                      <p className="trip-room-name">{selected.room_name}</p>
                      <dl className="trip-dates">
                        <div>
                          <dt>Nhận phòng</dt>
                          <dd>{dateLabel(selected.check_in)}</dd>
                        </div>
                        <div>
                          <dt>Trả phòng</dt>
                          <dd>{dateLabel(selected.check_out)}</dd>
                        </div>
                      </dl>
                      <p className="trip-occupancy">
                        {selected.rooms} phòng <span aria-hidden="true">·</span>{" "}
                        {selected.guests} khách{" "}
                        <span aria-hidden="true">·</span> {nights} đêm
                      </p>
                    </div>
                  </article>
                  <section className="trip-card">
                    <h2>Thông tin khách</h2>
                    <dl className="trip-facts">
                      <div>
                        <dt>Khách lưu trú</dt>
                        <dd>{selected.guest_name}</dd>
                      </div>
                      <div>
                        <dt>Số điện thoại</dt>
                        <dd>{selected.phone}</dd>
                      </div>
                    </dl>
                  </section>
                </div>
                <aside className="trip-summary">
                  <section className="trip-card">
                    <h2>Thông tin thanh toán</h2>
                    <div className="trip-total">
                      <span>Tổng thanh toán</span>
                      <strong>{money(selected.total)}</strong>
                      <small>Giá cho toàn bộ kỳ lưu trú</small>
                    </div>
                    <dl className="trip-facts">
                      <div>
                        <dt>Số phòng</dt>
                        <dd>{selected.rooms} phòng</dd>
                      </div>
                      <div>
                        <dt>Số đêm</dt>
                        <dd>{nights} đêm</dd>
                      </div>
                      <div>
                        <dt>Hình thức</dt>
                        <dd>Thanh toán tại khách sạn</dd>
                      </div>
                    </dl>
                    <p
                      className={`trip-payment ${selected.payment_status === "paid" ? "is-paid" : ""}`}
                    >
                      {selected.payment_status === "paid"
                        ? "Đã thanh toán"
                        : selected.payment_status === "unpaid"
                          ? "Chưa thanh toán"
                          : "Chưa có thông tin thanh toán"}
                    </p>
                  </section>
                  <section className="trip-card trip-cancellation">
                    <h2>Chính sách hủy</h2>
                    <p>Hạn hủy miễn phí:</p>
                    <time dateTime={selected.cancel_before}>
                      {new Date(selected.cancel_before).toLocaleString(
                        "vi-VN",
                        { timeZone: "Asia/Ho_Chi_Minh" },
                      )}
                    </time>
                    <small>Giờ Việt Nam (UTC+7)</small>
                    {selected.status === "confirmed" ? (
                      <div className="trip-cancel-action">
                        <p>
                          Hủy đơn sẽ giải phóng phòng đã đặt. Chỉ xác nhận khi
                          bạn muốn hủy đặt phòng này.
                        </p>
                        <button
                          className="outline trip-cancel-button"
                          disabled={busy}
                          onClick={() => void cancel()}
                        >
                          {busy ? "Đang hủy…" : "Xác nhận hủy đơn"}
                        </button>
                      </div>
                    ) : (
                      <p className="trip-closed-note">
                        {selected.status === "cancelled"
                          ? "Đơn đặt phòng này đã được hủy."
                          : "Kỳ lưu trú đã hoàn thành."}
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
