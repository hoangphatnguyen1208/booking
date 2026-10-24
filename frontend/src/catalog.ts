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
  const date = new Date(Date.now() + offset * 86400000);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (name: string) =>
    parts.find((part) => part.type === name)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
