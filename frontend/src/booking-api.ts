import { request } from "./api";
import type { HotelList } from "./api";
export type Room = {
  image_url?: string;
  id: string;
  hotel_id: string;
  name: string;
  capacity: number;
  total_rooms: number;
  active: boolean;
};
export type Inventory = {
  room_type_id: string;
  date: string;
  capacity: number;
  reserved: number;
  price: number;
};
export type Availability = {
  room: Room;
  available: number;
  total: number;
  currency: string;
  nights: Inventory[];
};
export type Booking = {
  room_image_url?: string;
  id: string;
  hotel_id: string;
  room_type_id: string;
  hotel_name: string;
  room_name: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guests: number;
  guest_name: string;
  phone: string;
  status: string;
  payment_status: string;
  currency: string;
  total: number;
  cancel_before: string;
  created_at: string;
};
export type BookingInput = {
  room_type_id: string;
  check_in: string;
  check_out: string;
  rooms: number;
  guests: number;
  guest_name: string;
  phone: string;
  expected_total: number;
};
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
export const bookingApi = {
  complete: (token: string, id: string) =>
    request("/bookings/" + id + "/complete", {
      method: "POST",
      headers: auth(token),
    }),
  search: (page: number, query: Record<string, string>, signal?: AbortSignal) =>
    request<HotelList>(
      "/hotels?" +
        new URLSearchParams({ page: String(page), limit: "20", ...query }),
      { signal },
    ),
  managed: (token: string, page: number, signal?: AbortSignal) =>
    request<HotelList>(`/me/hotels?page=${page}&limit=20`, {
      headers: auth(token),
      signal,
    }),
  availability: (
    id: string,
    from: string,
    to: string,
    rooms: number,
    guests: number,
    signal?: AbortSignal,
  ) =>
    request<Availability[]>(
      `/hotels/${id}/availability?` +
        new URLSearchParams({
          check_in: from,
          check_out: to,
          rooms: String(rooms),
          guests: String(guests),
        }),
      { signal },
    ),
  book: (token: string, key: string, input: BookingInput) =>
    request<Booking>("/bookings", {
      method: "POST",
      headers: { ...auth(token), "Idempotency-Key": key },
      body: JSON.stringify(input),
    }),
  bookings: (token: string, page: number, signal?: AbortSignal) =>
    request<Booking[]>(`/bookings?page=${page}`, {
      headers: auth(token),
      signal,
    }),
  detail: (token: string, id: string, signal?: AbortSignal) =>
    request<Booking>(`/bookings/${id}`, { headers: auth(token), signal }),
  cancel: (token: string, id: string) =>
    request<Booking>(`/bookings/${id}/cancel`, {
      method: "POST",
      headers: auth(token),
    }),
  rooms: (token: string, id: string, signal?: AbortSignal) =>
    request<Room[]>(`/hotels/${id}/manage-rooms`, {
      headers: auth(token),
      signal,
    }),
  saveRoom: (
    token: string,
    hotel: string,
    room: Omit<Room, "id" | "hotel_id">,
    id?: string,
  ) =>
    request<Room>(id ? `/room-types/${id}` : `/hotels/${hotel}/room-types`, {
      method: id ? "PUT" : "POST",
      headers: auth(token),
      body: JSON.stringify(room),
    }),
  inventory: (
    token: string,
    id: string,
    from: string,
    to: string,
    signal?: AbortSignal,
  ) =>
    request<Inventory[]>(
      `/room-types/${id}/inventory?` + new URLSearchParams({ from, to }),
      { headers: auth(token), signal },
    ),
  putInventory: (
    token: string,
    id: string,
    input: { from: string; to: string; capacity: number; price: number },
  ) =>
    request<{ message: string }>(`/room-types/${id}/inventory`, {
      method: "PUT",
      headers: auth(token),
      body: JSON.stringify(input),
    }),
  members: (token: string, id: string, signal?: AbortSignal) =>
    request<{ user_id: string; email: string; role: string }[]>(
      `/hotels/${id}/members`,
      { headers: auth(token), signal },
    ),
  member: (token: string, id: string, email: string, role: string) =>
    request<{ message: string }>(`/hotels/${id}/members`, {
      method: "PUT",
      headers: auth(token),
      body: JSON.stringify({ email, role }),
    }),
  hotelBookings: (
    token: string,
    id: string,
    page: number,
    signal?: AbortSignal,
  ) =>
    request<Booking[]>(`/hotels/${id}/bookings?page=${page}`, {
      headers: auth(token),
      signal,
    }),
};
export const money = (n: number, currency = "VND") =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(n);
export const dateLabel = (s: string) =>
  s.slice(0, 10).split("-").reverse().join("/");
