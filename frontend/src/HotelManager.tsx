import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError } from "./api";
import type { Hotel, HotelInput } from "./api";

const blank: HotelInput = {
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
  onChanged,
  onUnauthorized,
}: {
  token: string | null;
  onLogin: () => void;
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
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
        const result = await api.hotels(page, controller.signal);
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
      if (editing) await api.updateHotel(token, editing, input);
      else await api.createHotel(token, input);
      setMessage(editing ? "Đã cập nhật khách sạn." : "Đã tạo khách sạn.");
      setEditing(null);
      setInput(blank);
      setRefresh((value) => value + 1);
      onChanged();
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
      onChanged();
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
          Đăng nhập →
        </button>
      </div>
    );
  return (
    <section>
      <h1>Quản lý khách sạn</h1>
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
      <form className="hotel-form profile-card" onSubmit={save}>
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
                pattern={key === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined}
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
          <button className="primary" type="submit">
            {busy ? "Đang xử lý…" : editing ? "Lưu thay đổi" : "Tạo khách sạn"}
          </button>
          {editing && (
            <button
              className="outline"
              type="button"
              onClick={() => {
                setEditing(null);
                setInput(blank);
              }}
            >
              Hủy sửa
            </button>
          )}
        </fieldset>
      </form>
      {removing && (
        <div className="delete-confirm" role="alert">
          <p>
            Xóa khách sạn “{removing.name}”? Thao tác này không thể hoàn tác.
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
                <div>
                  <strong>{hotel.name}</strong>
                  <p>
                    {hotel.city}, {hotel.country} · {hotel.slug}
                  </p>
                </div>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => {
                    setEditing(hotel.id);
                    setInput({
                      name: hotel.name,
                      slug: hotel.slug,
                      address: hotel.address,
                      city: hotel.city,
                      country: hotel.country,
                      rank: hotel.rank,
                    });
                    setError("");
                    setMessage("");
                  }}
                >
                  Sửa {hotel.name}
                </button>
                <button
                  className="outline"
                  disabled={busy}
                  onClick={() => setRemoving(hotel)}
                >
                  Xóa {hotel.name}
                </button>
              </article>
            ))}
          </div>
          {!items.length && <p>Chưa có khách sạn.</p>}
          <div className="pagination">
            <button
              className="outline"
              disabled={page === 1 || busy}
              onClick={() => setPage((value) => value - 1)}
            >
              ← Trang trước
            </button>
            <span>Trang {page}</span>
            <button
              className="outline"
              disabled={!hasNext || busy}
              onClick={() => setPage((value) => value + 1)}
            >
              Trang sau →
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
