import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { api } from "./api";
import { useBooking } from "./BookingContext";
import { safeReturnPath } from "./return-path";
export default function AuthenticationPage({
  mode,
}: {
  mode: "login" | "register";
}) {
  const router = useRouter();
  const { setSession, setNotice } = useBooking();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const next = safeReturnPath(router.query.next);
  useEffect(() => () => request.current?.abort(), []);
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email")).trim(),
      password = String(data.get("password"));
    if (
      mode === "register" &&
      ([...password].length < 8 ||
        new TextEncoder().encode(password).length > 72)
    ) {
      setError("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte.");
      return;
    }
    const c = new AbortController();
    request.current = c;
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await api.register(email, password, c.signal);
        if (c.signal.aborted) return;
        void router.replace({
          pathname: "/login",
          query: { next, registered: "1" },
        });
      } else {
        const result = await api.login(email, password, c.signal);
        if (c.signal.aborted) return;
        setSession({
          token: result.access_token,
          expiresAt: Date.now() + result.expires_in * 1000,
        });
        setNotice("Đăng nhập thành công. Chào mừng bạn trở lại!");
        void router.replace(next);
      }
    } catch (err) {
      if (!c.signal.aborted)
        setError(
          err instanceof Error
            ? err.message
            : "Có lỗi xảy ra. Vui lòng thử lại.",
        );
    } finally {
      if (!c.signal.aborted) setBusy(false);
    }
  }
  return (
    <section className="auth-page">
      <Head>
        <title>{mode === "login" ? "Đăng nhập" : "Đăng ký"} · booking.</title>
      </Head>
      <Link className="outline" href={next}>
        ← Quay lại
      </Link>
      <div className="auth-card profile-card">
        <span className="brand-icon">b.</span>
        <h1>
          {mode === "login"
            ? "Chào mừng bạn trở lại"
            : "Bắt đầu một hành trình mới"}
        </h1>
        <p>
          {mode === "login"
            ? "Đăng nhập vào không gian của bạn."
            : "Tạo tài khoản để khám phá cùng booking."}
        </p>
        {mode === "login" && router.query.registered === "1" && (
          <div className="notice" role="status">
            Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.
          </div>
        )}
        <form method="post" onSubmit={authenticate}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              required
              disabled={busy}
            />
          </label>
          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              disabled={busy}
            />
          </label>
          {mode === "register" && (
            <small>Ít nhất 8 ký tự, tối đa 72 byte.</small>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy
              ? "Đang xử lý…"
              : mode === "login"
                ? "Đăng nhập →"
                : "Tạo tài khoản →"}
          </button>
        </form>
        <Link
          className="text-button"
          href={{
            pathname: mode === "login" ? "/register" : "/login",
            query: { next },
          }}
        >
          {mode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </Link>
      </div>
    </section>
  );
}
