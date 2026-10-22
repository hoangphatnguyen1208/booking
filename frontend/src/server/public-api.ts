// This module is imported only by getServerSideProps, never by client components.
export async function publicData<T>(
  path: string,
): Promise<{ data: T | null; status: number }> {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  const base = (
    configured && /^https?:\/\//.test(configured)
      ? configured
      : `${(process.env.BACKEND_ORIGIN || "http://127.0.0.1:8080").replace(/\/$/, "")}/api/v1`
  ).replace(/\/$/, "");
  try {
    const response = await fetch(base + path, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    return {
      data: response.ok ? ((await response.json()) as T) : null,
      status: response.status,
    };
  } catch {
    return { data: null, status: 503 };
  }
}
export function hotelQuery(
  query: Record<string, string | string[] | undefined>,
) {
  const result: Record<string, string> = {};
  for (const key of [
    "destination",
    "check_in",
    "check_out",
    "rooms",
    "guests",
    "rank",
    "page",
  ])
    if (typeof query[key] === "string") result[key] = query[key];
  return result;
}
