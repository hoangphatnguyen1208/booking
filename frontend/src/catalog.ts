export type Stay = {
  id: number;
  name: string;
  city: string;
  category: string;
  price: number;
  rating: string;
  style: string;
  description: string;
};
export const stays: Stay[] = [
  {
    id: 1,
    name: "An Nhiên Retreat",
    city: "Đà Lạt",
    category: "Giữa thiên nhiên",
    price: 1250000,
    rating: "4.9",
    style: "forest",
    description:
      "Một khoảng lặng giữa rừng thông, với ban công nhìn ra những triền đồi xanh.",
  },
  {
    id: 2,
    name: "The Coast House",
    city: "Đà Nẵng",
    category: "Gần biển",
    price: 1680000,
    rating: "4.8",
    style: "coast",
    description:
      "Không gian ngập nắng, những gam màu dịu nhẹ và biển xanh ngay trước mắt.",
  },
  {
    id: 3,
    name: "Mây Boutique Stay",
    city: "Hội An",
    category: "Trong thành phố",
    price: 980000,
    rating: "4.9",
    style: "town",
    description:
      "Một căn nhà nhỏ ấm áp, nơi bạn có thể chậm lại và khám phá phố cổ.",
  },
];
export const money = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value) + " ₫";
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function readSaved(): number[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("booking.saved") || "[]",
    );
    return Array.isArray(value)
      ? value.filter(
          (id): id is number =>
            typeof id === "number" && stays.some((stay) => stay.id === id),
        )
      : [];
  } catch {
    return [];
  }
}
