import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import type { HotelList } from "./api";
import { bookingApi } from "./booking-api";
import { localDate, toStay } from "./catalog";
import HotelGrid from "./HotelGrid";
export default function ExplorePage({
  initialData,
  query,
}: {
  initialData: HotelList | null;
  query: Record<string, string>;
}) {
  const router = useRouter();
  const hotelPage = Math.max(1, Number(query.page) || 1);
  const category = query.rank ? `${query.rank} sao` : "Tất cả";
  const [destination, setDestination] = useState(query.destination || "");
  const [checkIn, setCheckIn] = useState(query.check_in || localDate(1));
  const [checkOut, setCheckOut] = useState(query.check_out || localDate(3));
  const [searchGuests, setSearchGuests] = useState(query.guests || "2");
  const [searchError, setSearchError] = useState("");
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const queryKey = JSON.stringify(query);
  useEffect(() => {
    if (initialData && reload === 0) return;
    const c = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize loading state with the API request.
    setLoading(true);
    setError("");
    bookingApi
      .search(
        hotelPage,
        JSON.parse(queryKey) as Record<string, string>,
        c.signal,
      )
      .then((result) => {
        if (!c.signal.aborted) setData(result);
      })
      .catch((err) => {
        if (!c.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không tải được khách sạn.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [hotelPage, queryKey, reload, initialData]);
  function navigate(next: Record<string, string>) {
    void router.push({
      pathname: "/",
      query: Object.fromEntries(
        Object.entries(next).filter(([, value]) => value !== ""),
      ),
    });
  }
  function search(event: FormEvent) {
    event.preventDefault();
    if (checkIn < localDate() || checkOut <= checkIn) {
      setSearchError(
        "Ngày nhận phòng phải từ hôm nay; ngày trả phòng phải sau ngày nhận phòng.",
      );
      return;
    }
    setSearchError("");
    navigate({
      destination: destination.trim(),
      check_in: checkIn,
      check_out: checkOut,
      rooms: "1",
      guests: searchGuests,
    });
  }
  return (
    <>
      <Head>
        <title>Một nơi dành cho bạn · booking.</title>
      </Head>
      <section className="hero">
        <div className="hero-content">
          <span className="eyebrow">NHỮNG CHUYẾN ĐI ĐÁNG NHỚ</span>
          <h1>
            Đổi một nơi ở.
            <br />
            <em>Thêm một câu chuyện.</em>
          </h1>
          <p>Tìm một chốn dừng chân khiến bạn muốn ở lại lâu hơn.</p>
          <span className="hero-caption">
            Chạm vào bình yên, theo cách của bạn.
          </span>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun" />
          <div className="mountain far" />
          <div className="mountain near" />
          <div className="water" />
          <div className="house">
            <i />
            <b />
          </div>
          <div className="tree" />
          <div className="art-label">
            a little escape
            <br />
            <span>VIETNAM, WITH LOVE</span>
          </div>
        </div>
      </section>
      <form className="search-panel" onSubmit={search}>
        <label>
          <span>ĐIỂM ĐẾN</span>
          <input
            aria-label="Điểm đến"
            placeholder="Bạn muốn đi đâu?"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
          />
        </label>
        <label>
          <span>NHẬN PHÒNG</span>
          <input
            aria-label="Ngày nhận phòng"
            type="date"
            min={localDate()}
            required
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </label>
        <label>
          <span>TRẢ PHÒNG</span>
          <input
            aria-label="Ngày trả phòng"
            type="date"
            min={checkIn}
            required
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
          />
        </label>
        <label>
          <span>DU KHÁCH</span>
          <select
            aria-label="Số khách"
            value={searchGuests}
            onChange={(e) => setSearchGuests(e.target.value)}
          >
            <option value="1">1 người lớn</option>
            <option value="2">2 người lớn</option>
            <option value="3">3 người lớn</option>
            <option value="4">4 người lớn</option>
          </select>
        </label>
        <button className="primary" type="submit">
          Tìm nơi ở <span>→</span>
        </button>
      </form>
      {searchError && (
        <p className="error" role="alert">
          {searchError}
        </p>
      )}
      <div className="section-heading">
        <div>
          <span className="eyebrow dark">ĐI THEO CẢM HỨNG</span>
          <h2>Một nơi dành cho bạn</h2>
          <p>Những không gian nhỏ, cho những trải nghiệm lớn.</p>
        </div>
        <span className="sample-badge">Khách sạn · trang {hotelPage}</span>
      </div>
      <div className="filters" aria-label="Loại nơi ở">
        {["Tất cả", "3 sao", "4 sao", "5 sao"].map((item, index) => (
          <button
            key={item}
            className={category === item ? "selected" : ""}
            aria-pressed={category === item}
            onClick={() =>
              navigate({
                ...query,
                rank: item === "Tất cả" ? "" : item[0],
                page: "1",
              })
            }
          >
            <span aria-hidden="true">{["✧", "♧", "≈", "⌂"][index]}</span>
            {item}
          </button>
        ))}
      </div>

      {loading && <p role="status">Đang tải khách sạn…</p>}
      {error && (
        <div className="empty-state">
          <p className="error" role="alert">
            {error}
          </p>
          <button className="outline" onClick={() => setReload((v) => v + 1)}>
            Thử lại
          </button>
        </div>
      )}
      {!loading && !error && (
        <HotelGrid items={(data?.items || []).map(toStay)} />
      )}
      <div className="pagination">
        <button
          className="outline"
          disabled={hotelPage === 1 || loading}
          onClick={() => navigate({ ...query, page: String(hotelPage - 1) })}
        >
          ← Trang trước
        </button>
        <span>Trang {hotelPage}</span>
        <button
          className="outline"
          disabled={
            loading || !!error || !data || data.items.length < data.limit
          }
          onClick={() => navigate({ ...query, page: String(hotelPage + 1) })}
        >
          Trang sau →
        </button>
      </div>
      <div className="collection-note">
        ⓘ Dữ liệu khách sạn từ hệ thống. Giá và tồn phòng được xác nhận lại khi
        gửi đơn.
      </div>
    </>
  );
}
