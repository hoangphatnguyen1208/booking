import RoomPhoto from "./RoomPhoto";
import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { bookingApi, money } from "./booking-api";
import type { Availability, Booking, BookingInput } from "./booking-api";
import { localDate } from "./catalog";
export default function BookingPanel({
  hotelId,
  token,
  onLogin,
  onTrips,
}: {
  hotelId: string;
  token: string | null;
  onLogin: () => void;
  onTrips: () => void;
}) {
  const [from, setFrom] = useState(localDate(1)),
    [to, setTo] = useState(localDate(3));
  const [rooms, setRooms] = useState(1),
    [guests, setGuests] = useState(2);
  const [available, setAvailable] = useState<Availability[] | null>(null),
    [selected, setSelected] = useState<Availability | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [booking, setBooking] = useState<Booking | null>(null);
  const keyRef = useRef({ payload: "", key: "" });
  const submitLock = useRef(false);
  const [name, setName] = useState(""),
    [phone, setPhone] = useState("");
  function changed() {
    setAvailable(null);
    setSelected(null);
    setError("");
  }
  async function check(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSelected(null);
    try {
      setAvailable(
        await bookingApi.availability(hotelId, from, to, rooms, guests),
      );
    } catch (err) {
      setAvailable(null);
      setError(
        err instanceof Error ? err.message : "Không kiểm tra được phòng",
      );
    } finally {
      setBusy(false);
    }
  }
  async function book(event: FormEvent) {
    event.preventDefault();
    if (!token) {
      onLogin();
      return;
    }
    if (!selected || busy || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setError("");
    try {
      const input: BookingInput = {
        room_type_id: selected.room.id,
        check_in: from,
        check_out: to,
        rooms,
        guests,
        guest_name: name.trim(),
        phone: phone.trim(),
        expected_total: selected.total,
      };
      const payload = JSON.stringify(input);
      if (keyRef.current.payload !== payload) {
        const hash = Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(token + payload),
            ),
          ),
        )
          .map((x) => x.toString(16).padStart(2, "0"))
          .join("");
        let key = crypto.randomUUID();
        try {
          const existing = sessionStorage.getItem("booking-attempt:" + hash);
          if (existing) key = existing as typeof key;
          else sessionStorage.setItem("booking-attempt:" + hash, key);
        } catch {
          /* Keep an in-memory key when storage is unavailable. */
        }
        keyRef.current = { payload, key };
      }
      setBooking(await bookingApi.book(token, keyRef.current.key, input));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Không tạo được đơn. Thử lại với cùng thông tin để tra lại kết quả.",
      );
    } finally {
      submitLock.current = false;
      setBusy(false);
    }
  }
  if (booking)
    return (
      <section className="booking-panel">
        <h3>Đặt phòng thành công</h3>
        <p role="status">Mã đơn: {booking.id}</p>
        <p>
          {booking.room_name} · {money(booking.total)} · Thanh toán tại khách
          sạn
        </p>
        <button className="primary" onClick={onTrips}>
          Xem chuyến đi của tôi
        </button>
      </section>
    );
  return (
    <section className="booking-panel">
      <h3>Chọn phòng cho chuyến đi</h3>
      <form onSubmit={check}>
        <fieldset disabled={busy}>
          <label>
            Nhận phòng
            <input
              type="date"
              aria-label="Ngày nhận phòng đặt phòng"
              min={localDate()}
              value={from}
              required
              onChange={(e) => {
                setFrom(e.target.value);
                changed();
              }}
            />
          </label>
          <label>
            Trả phòng
            <input
              type="date"
              aria-label="Ngày trả phòng đặt phòng"
              min={from}
              value={to}
              required
              onChange={(e) => {
                setTo(e.target.value);
                changed();
              }}
            />
          </label>
          <label>
            Số phòng
            <input
              type="number"
              min="1"
              max="100"
              value={rooms}
              onChange={(e) => {
                setRooms(Number(e.target.value));
                changed();
              }}
              required
            />
          </label>
          <label>
            Số khách
            <input
              type="number"
              min="1"
              max="2000"
              value={guests}
              onChange={(e) => {
                setGuests(Number(e.target.value));
                changed();
              }}
              required
            />
          </label>
          <button className="primary">Kiểm tra phòng trống</button>
        </fieldset>
      </form>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {busy && <p role="status">Đang xử lý…</p>}
      {available?.length === 0 && (
        <p>Không còn phòng phù hợp cho khoảng ngày này.</p>
      )}
      {available?.map((item) => (
        <div className="room-option" key={item.room.id}>
          <RoomPhoto
            key={item.room.image_url}
            src={item.room.image_url}
            name={item.room.name}
          />
          <strong>{item.room.name}</strong>
          <p>
            Tối đa {item.room.capacity} khách/phòng · Còn {item.available} phòng
          </p>
          <p>
            {money(item.total)} / {rooms} phòng / toàn bộ kỳ lưu trú
          </p>
          <button
            className="outline"
            disabled={busy}
            onClick={() => setSelected(item)}
          >
            Chọn {item.room.name}
          </button>
        </div>
      ))}
      {selected && (
        <form onSubmit={book}>
          <h4>Xác nhận đặt {selected.room.name}</h4>
          <p>
            Tổng: {money(selected.total)}. Thanh toán tại khách sạn. Hủy miễn
            phí trước 00:00 ngày nhận phòng (giờ Việt Nam).
          </p>
          <label>
            Tên khách
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={30}
            />
          </label>
          {token ? (
            <button className="primary" disabled={busy}>
              Xác nhận đặt phòng
            </button>
          ) : (
            <button type="button" className="primary" onClick={onLogin}>
              Đăng nhập để đặt phòng
            </button>
          )}
        </form>
      )}
    </section>
  );
}
