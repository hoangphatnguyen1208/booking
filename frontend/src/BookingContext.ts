import { createContext, useContext } from "react";
import type { BookingState } from "./BookingProvider";
export const BookingContext = createContext<BookingState | null>(null);
export function useBooking() {
  const value = useContext(BookingContext);
  if (!value) throw new Error("BookingProvider is required");
  return value;
}
