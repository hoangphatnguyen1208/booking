import { UNAUTHORIZED_EVENT } from "./session";

export type User = {
  roles?: { id: string; name: string }[];
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};
export type Hotel = {
  image_url?: string;
  amenities?: string[];
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  country: string;
  rank: number;
  created_at: string;
  updated_at: string;
};
export type HotelInput = Pick<
  Hotel,
  | "name"
  | "slug"
  | "address"
  | "city"
  | "country"
  | "rank"
  | "image_url"
  | "amenities"
>;
export type HotelList = { items: Hotel[]; page: number; limit: number };
export type TokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
};
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}
const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      signal: options.signal
        ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
        : AbortSignal.timeout(15000),
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new ApiError(
      0,
      "Không kết nối được máy chủ. Kiểm tra kết nối và thử lại.",
    );
  }
  if (!response.ok) {
    const authorization = new Headers(options.headers).get("Authorization");
    if (
      response.status === 401 &&
      authorization?.startsWith("Bearer ") &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, { detail: authorization.slice(7) }),
      );
    }
    const messages: Record<number, string> = {
      400:
        path === "/auth/login"
          ? "Email hoặc mật khẩu không đúng."
          : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
      401: "Phiên đăng nhập không còn hợp lệ.",
      403: "Bạn không có quyền thực hiện thao tác này.",
      404: "Khách sạn không còn tồn tại.",
      409: path.startsWith("/hotels")
        ? "Dữ liệu bị xung đột. Kiểm tra slug hoặc tồn phòng."
        : path.startsWith("/auth")
          ? "Email này đã được đăng ký."
          : "Phòng, giá hoặc trạng thái đơn đã thay đổi. Vui lòng tải lại.",
      429: "Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.",
    };
    throw new ApiError(
      response.status,
      messages[response.status] ||
        "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.",
    );
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(response.status, "Phản hồi từ máy chủ không hợp lệ.");
  }
}
export const api = {
  hotels: (page = 1, signal?: AbortSignal) =>
    request<HotelList>(`/hotels?page=${page}&limit=20`, { signal }),
  hotel: (id: string, signal?: AbortSignal) =>
    request<Hotel>(`/hotels/${encodeURIComponent(id)}`, { signal }),
  createHotel: (token: string, input: HotelInput) =>
    request<Hotel>("/hotels", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    }),
  updateHotel: (token: string, id: string, input: HotelInput) =>
    request<Hotel>(`/hotels/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(input),
    }),
  deleteHotel: (token: string, id: string) =>
    request<{ message: string }>(`/hotels/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }),
  register: (email: string, password: string, signal?: AbortSignal) =>
    request<User>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      signal,
    }),
  login: async (email: string, password: string, signal?: AbortSignal) => {
    const data = await request<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      signal,
    });
    if (
      !data.access_token ||
      !Number.isFinite(data.expires_in) ||
      data.expires_in <= 0 ||
      data.expires_in > 2147483
    )
      throw new ApiError(200, "Phản hồi đăng nhập không hợp lệ.");
    return data;
  },
  me: (token: string, signal?: AbortSignal) =>
    request<User>("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    }),
};
