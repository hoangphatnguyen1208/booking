import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { bookingApi, money, dateLabel } from "./booking-api";
import type { Room, Inventory, Booking } from "./booking-api";
import RoomPhoto from "./RoomPhoto";
import { localDate } from "./catalog";
export default function HotelWorkspace({
  token,
  id,
}: {
  token: string;
  id: string;
}) {
  const [rooms, setRooms] = useState<Room[]>([]),
    [selected, setSelected] = useState<string>(""),
    [name, setName] = useState(""),
    [imageUrl, setImageUrl] = useState(""),
    [capacity, setCapacity] = useState(2),
    [total, setTotal] = useState(1),
    [active, setActive] = useState(true);
  const [from, setFrom] = useState(localDate(1)),
    [to, setTo] = useState(localDate(31)),
    [daily, setDaily] = useState(1),
    [price, setPrice] = useState(500000),
    [inventory, setInventory] = useState<Inventory[]>([]);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [reload, setReload] = useState(0);
  const [members, setMembers] = useState<
      { user_id: string; email: string; role: string }[]
    >([]),
    [email, setEmail] = useState(""),
    [role, setRole] = useState("manager");
  const [bookings, setBookings] = useState<Booking[]>([]),
    [bookingPage, setBookingPage] = useState(1);
  useEffect(() => {
    const c = new AbortController();
    async function load() {
      try {
        setRooms(await bookingApi.rooms(token, id, c.signal));
      } catch (err) {
        if (!c.signal.aborted)
          setError(err instanceof Error ? err.message : "Không tải được phòng");
      }
    }
    void load();
    return () => c.abort();
  }, [token, id, reload]);
  function failed(err: unknown) {
    setError(err instanceof Error ? err.message : "Không xử lý được yêu cầu");
  }
  async function saveRoom(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const room = await bookingApi.saveRoom(
        token,
        id,
        { name, image_url: imageUrl, capacity, total_rooms: total, active },
        selected || undefined,
      );
      setSelected(room.id);
      setMessage("Đã lưu loại phòng.");
      setReload((n) => n + 1);
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function saveInventory(e: FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      await bookingApi.putInventory(token, selected, {
        from,
        to,
        capacity: daily,
        price,
      });
      setInventory(await bookingApi.inventory(token, selected, from, to));
      setMessage("Đã lưu giá và tồn phòng theo ngày.");
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function loadInventory() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      setInventory(await bookingApi.inventory(token, selected, from, to));
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function loadMembers() {
    setBusy(true);
    setError("");
    try {
      setMembers(await bookingApi.members(token, id));
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function saveMember(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await bookingApi.member(token, id, email, role);
      setMembers(await bookingApi.members(token, id));
      setMessage("Đã cập nhật thành viên.");
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  async function loadBookings(page: number) {
    setBusy(true);
    setError("");
    try {
      setBookings(await bookingApi.hotelBookings(token, id, page));
      setBookingPage(page);
    } catch (err) {
      failed(err);
    } finally {
      setBusy(false);
    }
  }
  function select(room: Room) {
    setSelected(room.id);
    setName(room.name);
    setImageUrl(room.image_url || "");
    setCapacity(room.capacity);
    setTotal(room.total_rooms);
    setActive(room.active);
    setDaily(room.total_rooms);
    setInventory([]);
  }
  return (
    <section className="workspace">
      <h2>Phòng, tồn kho và nhân sự</h2>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      <div className="filters">
        {rooms.map((room) => (
          <button
            key={room.id}
            onClick={() => select(room)}
            className={selected === room.id ? "selected" : ""}
          >
            {room.name}
            {!room.active ? " (ngừng bán)" : ""}
          </button>
        ))}
        <button
          onClick={() => {
            setSelected("");
            setName("");
            setImageUrl("");
            setCapacity(2);
            setTotal(1);
            setActive(true);
            setInventory([]);
          }}
        >
          + Loại phòng mới
        </button>
      </div>
      {imageUrl && (
        <RoomPhoto
          key={imageUrl}
          src={imageUrl}
          name={name || "đang chỉnh sửa"}
        />
      )}
      <form className="hotel-form" onSubmit={saveRoom}>
        <h3>{selected ? "Sửa loại phòng" : "Thêm loại phòng"}</h3>
        <fieldset disabled={busy}>
          <label>
            Tên loại phòng
            <input
              required
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label>
            Sức chứa mỗi phòng
            <input
              type="number"
              min="1"
              max="20"
              required
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </label>
          <label>
            Tổng số phòng
            <input
              type="number"
              min="1"
              max="10000"
              required
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
            />
          </label>
          <label>
            Trạng thái
            <select
              value={String(active)}
              onChange={(e) => setActive(e.target.value === "true")}
            >
              <option value="true">Đang bán</option>
              <option value="false">Ngừng bán</option>
            </select>
          </label>
          <label>
            Ảnh phòng (URL HTTPS)
            <input
              type="url"
              maxLength={2048}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </label>
          <div className="form-actions">
            <button className="primary">Lưu loại phòng</button>
          </div>
        </fieldset>
      </form>
      {selected && (
        <form className="hotel-form" onSubmit={saveInventory}>
          <h3>Giá / tồn mỗi ngày (VND)</h3>
          <p>
            Ngày kết thúc không nằm trong khoảng mở bán. Tồn không được thấp hơn
            số đã đặt.
          </p>
          <fieldset disabled={busy}>
            <label>
              Từ ngày
              <input
                type="date"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Đến ngày
              <input
                type="date"
                required
                min={from}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label>
              Số phòng mở bán mỗi ngày
              <input
                type="number"
                required
                min="0"
                max={total}
                value={daily}
                onChange={(e) => setDaily(Number(e.target.value))}
              />
            </label>
            <label>
              Giá mỗi đêm (VND)
              <input
                type="number"
                required
                min="0"
                max="1000000000000"
                step="1"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </label>
            <button className="primary">Lưu giá và tồn</button>
            <button
              type="button"
              className="outline"
              onClick={() => void loadInventory()}
            >
              Xem tồn theo ngày
            </button>
          </fieldset>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Ngày</th>
                  <th>Tổng mở</th>
                  <th>Đã đặt</th>
                  <th>Giá</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((row) => (
                  <tr key={row.date}>
                    <td>{dateLabel(row.date)}</td>
                    <td>{row.capacity}</td>
                    <td>{row.reserved}</td>
                    <td>{money(row.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </form>
      )}
      <section className="profile-card">
        <h3>Thành viên quản lý</h3>
        <button
          className="outline"
          disabled={busy}
          onClick={() => void loadMembers()}
        >
          Xem thành viên
        </button>
        {members.map((member) => (
          <p key={member.user_id}>
            {member.email} · {member.role}
          </p>
        ))}
        <form className="hotel-form" onSubmit={saveMember}>
          <fieldset disabled={busy}>
            <label>
              Email tài khoản đã đăng ký
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              Vai trò
              <select value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="owner">Owner</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
                <option value="remove">Thu hồi quyền</option>
              </select>
            </label>
            <button className="primary">Cập nhật quyền</button>
          </fieldset>
        </form>
        <p>
          Chỉ owner/admin được thay đổi thành viên. Không thể thu hồi owner cuối
          cùng.
        </p>
      </section>
      <section className="profile-card">
        <h3>Đơn của khách sạn</h3>
        <button
          className="outline"
          disabled={busy}
          onClick={() => void loadBookings(1)}
        >
          Tải đơn khách sạn
        </button>
        {bookings.map((item) => (
          <article className="room-option" key={item.id}>
            <strong>{item.id}</strong>
            <p>
              {item.guest_name} · {item.phone}
            </p>
            <p>
              {item.room_name} · {dateLabel(item.check_in)} –{" "}
              {dateLabel(item.check_out)} · {money(item.total)} · {item.status}
            </p>
            {item.status === "confirmed" && (
              <button
                className="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  setError("");
                  void bookingApi
                    .complete(token, item.id)
                    .then(() => loadBookings(bookingPage))
                    .catch(failed)
                    .finally(() => setBusy(false));
                }}
              >
                Xác nhận đã thu tiền và hoàn thành lưu trú
              </button>
            )}
          </article>
        ))}
        <div className="pagination">
          <button
            className="outline"
            disabled={busy || bookingPage === 1}
            onClick={() => void loadBookings(bookingPage - 1)}
          >
            Đơn trang trước
          </button>
          <span>Trang {bookingPage}</span>
          <button
            className="outline"
            disabled={busy || bookings.length < 20}
            onClick={() => void loadBookings(bookingPage + 1)}
          >
            Đơn trang sau
          </button>
        </div>
      </section>
    </section>
  );
}
