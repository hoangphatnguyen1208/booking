import { useEffect, useState } from "react";
import Head from "next/head";
import { api, ApiError } from "./api";
import { toStay } from "./catalog";
import type { Stay } from "./catalog";
import { useBooking } from "./BookingContext";
import HotelGrid from "./HotelGrid";
export default function SavedPage() {
  const { saved, savedReady } = useBooking();
  const [items, setItems] = useState<Stay[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [reload, setReload] = useState(0);
  useEffect(() => {
    if (!savedReady) return;
    const c = new AbortController();
    // oxlint-disable-next-line react/set-state-in-effect -- Synchronize loading state with the API request.
    setLoading(true);
    setError("");
    Promise.all(
      saved.map(async (id) => {
        try {
          return toStay(await api.hotel(id, c.signal));
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) return null;
          throw err;
        }
      }),
    )
      .then((rows) => {
        if (!c.signal.aborted)
          setItems(rows.filter((row): row is Stay => row !== null));
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
  }, [saved, savedReady, reload]);
  return (
    <>
      <Head>
        <title>Những nơi bạn yêu thích · booking.</title>
      </Head>
      <div className="section-heading">
        <div>
          <span className="eyebrow dark">CHO CHUYẾN ĐI TIẾP THEO</span>
          <h1>Những nơi bạn yêu thích</h1>
          <p>Khách sạn bạn đã lưu trên thiết bị này.</p>
        </div>
        <span className="sample-badge">{saved.length} nơi đã lưu</span>
      </div>
      {loading ? (
        <p role="status">Đang tải khách sạn…</p>
      ) : error ? (
        <div className="empty-state">
          <p className="error" role="alert">
            {error}
          </p>
          <button className="outline" onClick={() => setReload((v) => v + 1)}>
            Thử lại
          </button>
        </div>
      ) : (
        <HotelGrid items={items} savedPage />
      )}
    </>
  );
}
