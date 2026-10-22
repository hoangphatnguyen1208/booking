import type { Stay } from "./catalog";
export default function HotelArtwork({ stay }: { stay: Stay }) {
  return (
    <div className={`stay-art ${stay.style}`} aria-hidden="true">
      {stay.image_url && (
        <img
          src={stay.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}
      <div className="scenery" />
      <div className="cabin">
        <i />
        <b />
      </div>
    </div>
  );
}
