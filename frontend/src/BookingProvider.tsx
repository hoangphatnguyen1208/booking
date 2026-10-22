import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { BookingContext } from "./BookingContext";
import { useSession } from "./useSession";
import { api, ApiError } from "./api";
import type { User } from "./api";
import { readSaved } from "./catalog";

function useBookingState() {
  const { session, setSession, ready } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [saved, setSaved] = useState<string[]>([]);
  const [savedReady, setSavedReady] = useState(false);
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Favorites live in browser storage and are restored after hydration.
    setSaved(readSaved());
    setSavedReady(true);
  }, []);
  useEffect(() => {
    if (savedReady)
      try {
        localStorage.setItem("booking.saved", JSON.stringify(saved));
      } catch {
        /* Keep in-memory favorites. */
      }
  }, [saved, savedReady]);
  useEffect(() => {
    if (!session) {
      // oxlint-disable-next-line react/set-state-in-effect -- Clear cached profile when the external session changes.
      setUser(null);
      setProfileError("");
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    const c = new AbortController();
    api
      .me(session.token, c.signal)
      .then((value) => {
        if (!c.signal.aborted) setUser(value);
      })
      .catch((error) => {
        if (c.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) {
          setSession(null);
          setUser(null);
          setNotice(
            "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
          );
        } else
          setProfileError(
            error instanceof Error ? error.message : "Không tải được hồ sơ.",
          );
      })
      .finally(() => {
        if (!c.signal.aborted) setProfileLoading(false);
      });
    return () => c.abort();
  }, [session, setSession]);
  useEffect(() => {
    if (!session) return;
    const timeout = window.setTimeout(
      () => {
        setSession(null);
        setUser(null);
        setNotice("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      },
      Math.min(2147483647, Math.max(0, session.expiresAt - Date.now())),
    );
    return () => window.clearTimeout(timeout);
  }, [session, setSession]);
  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  function logout() {
    setSession(null);
    setUser(null);
    setNotice("Bạn đã đăng xuất.");
  }
  return {
    session,
    setSession,
    ready,
    user,
    notice,
    setNotice,
    profileError,
    profileLoading,
    saved,
    savedReady,
    toggleSaved,
    logout,
  };
}
export type BookingState = ReturnType<typeof useBookingState>;
export function BookingProvider({ children }: { children: ReactNode }) {
  const value = useBookingState();
  return (
    <BookingContext.Provider value={value}>{children}</BookingContext.Provider>
  );
}
