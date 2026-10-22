import Link from "next/link";
import type { Stay } from "./catalog";
import HotelArtwork from "./HotelArtwork";
import { useBooking } from "./BookingContext";
export default function HotelGrid({
  items,
  savedPage = false,
}: {
  items: Stay[];
  savedPage?: boolean;
}) {
  const { saved, toggleSaved } = useBooking();
  return (
    <>
      <div className="stay-grid">
        {items.map((stay) => (
          <article className="stay-card" key={stay.id}>
            <div className="art-wrapper">
              <HotelArtwork stay={stay} />
              <span className="stay-tag">{stay.category}</span>
              <button
                className={`save-button ${saved.includes(stay.id) ? "is-saved" : ""}`}
                aria-label={`${saved.includes(stay.id) ? "Bỏ lưu" : "Lưu"} ${stay.name}`}
                aria-pressed={saved.includes(stay.id)}
                onClick={() => toggleSaved(stay.id)}
              >
                {saved.includes(stay.id) ? "♥" : "♡"}
              </button>
            </div>
            <div className="stay-meta">
              <span>
                {stay.city}, {stay.country}
              </span>
              <span className="rating">★ {stay.rating}</span>
            </div>
            <Link className="stay-title" href={`/hotels/${stay.id}`}>
              {stay.name} <span>↗</span>
            </Link>
            <p>{stay.description}</p>
            <div className="stay-price">
              <span>Chưa có thông tin giá phòng</span>
            </div>
          </article>
        ))}
      </div>
      {!items.length && (
        <div className="empty-state">
          <span>⌕</span>
          <h2>
            {savedPage
              ? "Chưa có nơi nào được lưu"
              : "Chưa tìm thấy nơi phù hợp"}
          </h2>
          <p>
            {savedPage
              ? "Nhấn biểu tượng trái tim để lưu nơi bạn thích."
              : "Không có khách sạn phù hợp trên trang này. Thử trang khác hoặc bỏ bộ lọc."}
          </p>
          <Link className="outline" href="/">
            Khám phá tất cả
          </Link>
        </div>
      )}
    </>
  );
}
