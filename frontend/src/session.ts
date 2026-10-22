export type Session = { token: string; expiresAt: number };
export const SESSION_KEY = "booking.session";
export const UNAUTHORIZED_EVENT = "booking:unauthorized";

export function writeSession(session: Session | null) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Login still works in memory when browser storage is unavailable.
  }
}

export function readSession(): Session | null {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    );
    if (
      value &&
      typeof value === "object" &&
      "token" in value &&
      typeof value.token === "string" &&
      value.token.trim() &&
      "expiresAt" in value &&
      typeof value.expiresAt === "number" &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > Date.now()
    ) {
      return { token: value.token, expiresAt: value.expiresAt };
    }
    writeSession(null);
  } catch {
    writeSession(null);
  }
  return null;
}
