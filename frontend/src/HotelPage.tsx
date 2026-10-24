import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { api } from "./api";
import type { Hotel } from "./api";
import { toStay } from "./catalog";
import { useBooking } from "./BookingContext";
import HotelArtwork from "./HotelArtwork";
import BookingPanel from "./BookingPanel";
export default function HotelPage({
  id,
  initialHotel,
}: {
  id: string;
  initialHotel: Hotel | null;
}) {
  const router = useRouter();
  const { session, saved, toggleSaved } = useBooking();
  const [hotel, setHotel] = useState(initialHotel),
    [loading, setLoading] = useState(!initialHotel),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (initialHotel && reload === 0) return;
    const c = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize loading state with the API request.
    setLoading(true);
    setError("");
    api
      .hotel(id, c.signal)
      .then((value) => {
        if (!c.signal.aborted) setHotel(value);
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
  }, [id, initialHotel, reload]);
  return (
    <section className="hotel-detail-page">
      <Head>
        <title>{hotel?.name || "Chi tiết khách sạn"} · booking.</title>
      </Head>
      <Link className="outline" href="/">
        Quay lại danh sách
      </Link>
      {loading ? (
        <>
          <h1>Chi tiết khách sạn</h1>
          <p role="status">Đang tải chi tiết…</p>
        </>
      ) : error ? (
        <>
          <h1>Chi tiết khách sạn</h1>
          <p className="error" role="alert">
            {error}
          </p>
          <button className="outline" onClick={() => setReload((v) => v + 1)}>
            Thử lại
          </button>
        </>
      ) : (
        hotel && (
          <>
            <header className="page-heading">
              <div>
                <span className="sample-badge">Thông tin khách sạn</span>
                <h1>{hotel.name}</h1>
                <p>
                  {hotel.city}, {hotel.country} ·{" "}
                  {hotel.rank ? `${hotel.rank} sao` : "Chưa xếp hạng"}
                </p>
              </div>
            </header>
            <HotelArtwork stay={toStay(hotel)} />
            <div className="filters">
              {hotel.amenities?.map((item) => (
                <span className="sample-badge" key={item}>
                  {item}
                </span>
              ))}
            </div>
            <p>{hotel.address || "Chưa có thông tin địa chỉ."}</p>
            <p>Chưa có thông tin giá phòng</p>
            <div className="collection-note">
              Thanh toán tại khách sạn. Giá và tồn phòng được kiểm tra lại khi
              đặt.
            </div>
            <BookingPanel
              key={id}
              hotelId={id}
              token={session?.token ?? null}
              onLogin={() =>
                void router.push({
                  pathname: "/login",
                  query: { next: router.asPath },
                })
              }
              onTrips={() => void router.push("/trips")}
            />
            <div className="detail-save-actions">
              <button className="outline" onClick={() => toggleSaved(id)}>
                {saved.includes(id) ? "Bỏ lưu nơi ở" : "Lưu cho chuyến đi sau"}
              </button>
            </div>
          </>
        )
      )}
    </section>
  );
}
