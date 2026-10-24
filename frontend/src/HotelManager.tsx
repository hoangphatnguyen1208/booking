import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "./api";
import type { Hotel, HotelInput } from "./api";
import { bookingApi } from "./booking-api";
import Link from "next/link";
import { useBooking } from "./BookingContext";

const blank: HotelInput = {
  image_url: "",
  amenities: [],
  name: "",
  slug: "",
  address: "",
  city: "",
  country: "",
  rank: 0,
};
export default function HotelManager({
  token,
  onLogin,
  onUnauthorized,
}: {
  token: string | null;
  onLogin: () => void;
  onUnauthorized: () => void;
}) {
  const { access } = useBooking();
  const roleFor = (id: string) =>
    access?.hotels.find((h) => h.hotel_id === id)?.role;
  const formRef = useRef<HTMLFormElement>(null);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState<Hotel[]>([]);
  const [page, setPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [input, setInput] = useState<HotelInput>(blank);
  const [removing, setRemoving] = useState<Hotel | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const result = await bookingApi.managed(
          token!,
          page,
          controller.signal,
        );
        if (!controller.signal.aborted) {
          setItems(result.items);
          setHasNext(result.items.length === result.limit);
        }
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không tải được dữ liệu.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, refresh, token]);
  function failed(err: unknown) {
    if (err instanceof ApiError && err.status === 401) onUnauthorized();
    else
      setError(
        err instanceof Error ? err.message : "Không lưu được khách sạn.",
      );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!token || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...input,
        amenities: [
          ...new Set(
            (input.amenities || [])
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        ],
      };
      if (editing) await api.updateHotel(token, editing, payload);
      else await api.createHotel(token, payload);
      setMessage(editing ? "Đã cập nhật khách sạn." : "Đã tạo khách sạn.");
      setEditing(null);
      setShowForm(false);
      setInput(blank);
      setRefresh((value) => value + 1);
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!token || !removing || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api.deleteHotel(token, removing.id);
      if (editing === removing.id) {
        setEditing(null);
        setInput(blank);
      }
      setRemoving(null);
      setMessage("Đã xóa khách sạn.");
      setRefresh((value) => value + 1);
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  if (!token)
    return (
      <div className="empty-state">
        <h1>Quản lý khách sạn</h1>
        <p>Đăng nhập để tạo, sửa và xóa khách sạn.</p>
        <button className="primary" onClick={onLogin}>
          Đăng nhập
        </button>
      </div>
    );
  return (
    <section className="management-page">
      <header className="page-heading">
        <div>
          <h1>Quản lý khách sạn</h1>
          <p>Không gian vận hành · Chỉ các khách sạn được phân công.</p>
        </div>
        {access?.admin && (
          <button
            className="primary"
            onClick={() => {
              setEditing(null);
              setInput(blank);
              setShowForm(true);
            }}
          >
            + Thêm khách sạn
          </button>
        )}
      </header>
      {message && (
        <div className="notice" role="status">
          {message}
        </div>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {showForm && (
        <form ref={formRef} className="hotel-form profile-card" onSubmit={save}>
          <h2>{editing ? "Sửa khách sạn" : "Tạo khách sạn"}</h2>
          <fieldset disabled={busy}>
            {(
              [
                ["name", "Tên khách sạn", 100],
                ["slug", "Slug", 100],
                ["address", "Địa chỉ", 255],
                ["city", "Thành phố", 100],
                ["country", "Quốc gia", 100],
              ] as const
            ).map(([key, label, max]) => (
              <label key={key}>
                {label}
                <input
                  name={key}
                  value={input[key]}
                  maxLength={max}
                  required={key !== "address"}
                  pattern={
                    key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined
                  }
                  onChange={(event) =>
                    setInput({ ...input, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label>
              Hạng sao
              <select
                value={input.rank}
                onChange={(event) =>
                  setInput({ ...input, rank: Number(event.target.value) })
                }
              >
                {[0, 1, 2, 3, 4, 5].map((rank) => (
                  <option key={rank} value={rank}>
                    {rank ? `${rank} sao` : "Chưa xếp hạng"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Ảnh đại diện (URL HTTPS)
              <input
                type="url"
                value={input.image_url || ""}
                maxLength={2048}
                onChange={(e) =>
                  setInput({ ...input, image_url: e.target.value })
                }
              />
            </label>
            <label>
              Tiện nghi (phân cách bằng dấu phẩy)
              <input
                value={(input.amenities || []).join(", ")}
                onChange={(e) =>
                  setInput({
                    ...input,
                    amenities: e.target.value
                      .split(",")
                      .map((value) => value.trim()),
                  })
                }
              />
            </label>
            <div className="form-actions">
              <button className="primary" type="submit">
                {busy
                  ? "Đang xử lý…"
                  : editing
                    ? "Lưu thay đổi"
                    : "Tạo khách sạn"}
              </button>
              {
                <button
                  className="outline"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setShowForm(false);
                    setInput(blank);
                  }}
                >
                  {editing ? "Hủy sửa" : "Hủy"}
                </button>
              }
            </div>
          </fieldset>
        </form>
      )}
      {removing && (
        <div className="delete-confirm" role="alert">
          <p>
            Xóa khách sạn “{removing.name}”? Khách sạn sẽ được ẩn khỏi danh sách
            đặt phòng.
          </p>
          <button
            className="primary"
            disabled={busy}
            onClick={() => void remove()}
          >
            Xác nhận xóa
          </button>
          <button
            className="outline"
            disabled={busy}
            onClick={() => setRemoving(null)}
          >
            Hủy
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Đang tải khách sạn…</p>
      ) : (
        <>
          <div className="management-list">
            {items.map((hotel) => (
              <article key={hotel.id}>
                <div className="management-info">
                  <span className="hotel-mark" aria-hidden="true">
                    {hotel.name.charAt(0)}
                    {hotel.image_url && (
                      <img
                        src={hotel.image_url}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    )}
                  </span>
                  <div>
                    <h3>{hotel.name}</h3>
                    <p>
                      {hotel.city}, {hotel.country}
                      {hotel.rank ? ` · ${hotel.rank} sao` : ""}
                    </p>
                    <small>{hotel.slug}</small>
                  </div>
                </div>
                <div className="management-actions">
                  <Link
                    className="outline"
                    href={`/manage/hotels/${hotel.id}`}
                    aria-label={`Phòng và nhân sự ${hotel.name}`}
                  >
                    Phòng & nhân sự
                  </Link>
                  {(access?.admin ||
                    ["owner", "manager"].includes(roleFor(hotel.id) || "")) && (
                    <button
                      className="outline"
                      disabled={busy}
                      aria-label={`Sửa ${hotel.name}`}
                      onClick={() => {
                        setShowForm(true);
                        requestAnimationFrame(() =>
                          formRef.current?.scrollIntoView({ block: "start" }),
                        );
                        setEditing(hotel.id);
                        setInput({
                          name: hotel.name,
                          slug: hotel.slug,
                          address: hotel.address,
                          city: hotel.city,
                          country: hotel.country,
                          rank: hotel.rank,
                          image_url: hotel.image_url || "",
                          amenities: hotel.amenities || [],
                        });
                        setError("");
                        setMessage("");
                      }}
                    >
                      Chỉnh sửa
                    </button>
                  )}
                  {(access?.admin || roleFor(hotel.id) === "owner") && (
                    <button
                      className="outline"
                      disabled={busy}
                      aria-label={`Xóa ${hotel.name}`}
                      onClick={() => {
                        setRemoving(hotel);
                        window.scrollTo(0, 0);
                      }}
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!items.length && !error && (
            <div className="empty-state">
              <h2>Chưa có khách sạn</h2>
              <p>Liên hệ quản trị viên để được phân công khách sạn.</p>
            </div>
          )}
          <div className="pagination">
            <button
              className="outline"
              disabled={page === 1 || busy}
              onClick={() => setPage((value) => value - 1)}
            >
              Trang trước
            </button>
            <span>Trang {page}</span>
            <button
              className="outline"
              disabled={!hasNext || busy}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau
            </button>
            <button
              className="outline"
              disabled={busy}
              onClick={() => setRefresh((value) => value + 1)}
            >
              Tải lại
            </button>
          </div>
        </>
      )}
    </section>
  );
}
