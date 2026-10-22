import { useState } from "react";

export default function RoomPhoto({
  src,
  name,
}: {
  src?: string;
  name: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="room-photo">
      {src && !failed ? (
        <img
          src={src}
          alt={`Phòng ${name}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span>Chưa có ảnh phòng</span>
      )}
    </div>
  );
}
