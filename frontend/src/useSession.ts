import { useCallback, useEffect, useRef, useState } from "react";
import {
  readSession,
  writeSession,
  SESSION_KEY,
  UNAUTHORIZED_EVENT,
} from "./session";
import type { Session } from "./session";

export function useSession() {
  const [session, updateSession] = useState(readSession);
  const current = useRef(session);
  const setSession = useCallback((next: Session | null) => {
    current.current = next;
    writeSession(next);
    updateSession(next);
  }, []);

  useEffect(() => {
    const storage = (event: StorageEvent) => {
      if (
        event.storageArea !== localStorage ||
        (event.key !== SESSION_KEY && event.key !== null)
      )
        return;
      const next = readSession();
      current.current = next;
      updateSession(next);
    };
    const unauthorized = (event: Event) => {
      // A delayed 401 from an older session must not log out a newer login.
      if ((event as CustomEvent<string>).detail === current.current?.token)
        setSession(null);
    };
    window.addEventListener("storage", storage);
    window.addEventListener(UNAUTHORIZED_EVENT, unauthorized);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(UNAUTHORIZED_EVENT, unauthorized);
    };
  }, [setSession]);

  return { session, setSession };
}
