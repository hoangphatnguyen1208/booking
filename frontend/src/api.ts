export type User = {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
};
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
const base = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(
  /\/$/,
  "",
);
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
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
    const messages: Record<number, string> = {
      400:
        path === "/auth/login"
          ? "Email hoặc mật khẩu không đúng."
          : "Thông tin không hợp lệ. Vui lòng kiểm tra lại.",
      401: "Phiên đăng nhập không còn hợp lệ.",
      409: "Email này đã được đăng ký.",
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
