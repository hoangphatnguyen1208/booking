import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookingContext } from "./BookingContext";
import { useSession } from "./useSession";
import { api, ApiError } from "./api";
import type { User } from "./api";
import { useRouter } from "next/router";
import { safeReturnPath } from "./return-path";

function useBookingState() {
  const { session, setSession, ready } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();
  const token = session?.token;
  const currentToken = useRef(token);
  useEffect(() => {
    currentToken.current = token;
  }, [token]);
  const pendingSaves = useRef(new Set<string>());
  const [savedState, setSavedState] = useState<{
    token: string;
    ids: string[];
    loaded: boolean;
    error: string;
  } | null>(null);
  const [savedReload, setSavedReload] = useState(0);
  const saved = token && savedState?.token === token ? savedState.ids : [];
  const savedReady =
    !!token && savedState?.token === token && savedState.loaded;
  const savedError =
    token && savedState?.token === token ? savedState.error : "";
  function refreshSaved() {
    setSavedReload((value) => value + 1);
  }
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- Reset account data before loading the new session.
    setSavedState(null);
    if (!token) return;
    const c = new AbortController();
    api
      .savedHotels(token, c.signal)
      .then((ids) => {
        if (!c.signal.aborted)
          setSavedState({ token, ids, loaded: true, error: "" });
      })
      .catch((error) => {
        if (!c.signal.aborted)
          setSavedState({
            token,
            ids: [],
            loaded: false,
            error:
              error instanceof Error
                ? error.message
                : "Không tải được danh sách đã lưu.",
          });
      });
    return () => c.abort();
  }, [token, savedReload]);
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
  async function toggleSaved(id: string) {
    if (!session || session.expiresAt <= Date.now()) {
      setNotice("Vui lòng đăng nhập để lưu khách sạn.");
      void router.push({
        pathname: "/login",
        query: { next: safeReturnPath(router.asPath) },
      });
      return;
    }
    if (!savedReady) {
      setNotice(savedError || "Đang tải danh sách đã lưu. Vui lòng thử lại.");
      return;
    }
    const requestToken = session.token;
    const key = `${requestToken}:${id}`;
    if (pendingSaves.current.has(key)) return;
    pendingSaves.current.add(key);
    const remove = saved.includes(id);
    try {
      await api.saveHotel(requestToken, id, remove);
      if (currentToken.current !== requestToken) return;
      setSavedState((current) =>
        current?.token === requestToken
          ? {
              ...current,
              ids: remove
                ? current.ids.filter((value) => value !== id)
                : [...new Set([...current.ids, id])],
            }
          : current,
      );
    } catch (error) {
      if (currentToken.current === requestToken)
        setNotice(
          error instanceof Error ? error.message : "Không lưu được khách sạn.",
        );
    } finally {
      pendingSaves.current.delete(key);
    }
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
    savedError,
    refreshSaved,
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
