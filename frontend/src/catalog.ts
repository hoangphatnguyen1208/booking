import type { Hotel } from "./api";
export type Stay = Hotel & {
  style: string;
  category: string;
  description: string;
  rating: string;
};
export function toStay(hotel: Hotel): Stay {
  return {
    ...hotel,
    style: "town",
    category: hotel.rank ? `${hotel.rank} sao` : "Chưa xếp hạng",
    rating: hotel.rank ? `${hotel.rank} sao` : "Chưa xếp hạng",
    description: hotel.address || "Chưa có thông tin địa chỉ.",
  };
}
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function readSaved(): string[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("booking.saved") || "[]",
    );
    return Array.isArray(value)
      ? [
          ...new Set(
            value.filter(
              (id): id is string =>
                typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id),
            ),
          ),
        ]
      : [];
  } catch {
    return [];
  }
}
