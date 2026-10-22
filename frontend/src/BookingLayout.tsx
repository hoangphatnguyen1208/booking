import { useEffect } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useBooking } from "./BookingContext";
import { safeReturnPath } from "./return-path";
import { pages, pagePath } from "./navigation";
import type { Page } from "./navigation";
import Footer from "./Footer";
const navigation = [
  ["explore", "⌘", "Khám phá"],
  ["saved", "♡", "Đã lưu"],
  ["trips", "▤", "Chuyến đi của tôi"],
  ["profile", "◎", "Tài khoản"],
  ["manage", "⌂", "Quản lý"],
  ["admin", "⚙", "Admin"],
] as const;
export default function BookingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, session, saved, notice, setNotice, logout, ready } =
    useBooking();
  const section = router.pathname.split("/")[1];
  const page =
    !section || section === "hotels"
      ? "explore"
      : pages.includes(section as Page)
        ? section
        : null;
  const currentTitle =
    section === "login"
      ? "Đăng nhập"
      : section === "register"
        ? "Đăng ký"
        : navigation.find((item) => item[0] === page)?.[2];
  function resetExplore() {
    void router.push("/");
  }
  useEffect(() => {
    const change = () => {
      const legacy = window.location.hash.slice(1);
      if (pages.includes(legacy as Page))
        void router.replace(pagePath(legacy as Page));
    };
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [router]);
  return (
    <div className="app-shell" data-session-ready={ready}>
      <aside className="sidebar">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            event.preventDefault();
            resetExplore();
          }}
        >
          <span className="brand-icon">b.</span> booking
          <span className="brand-dot">.</span>
        </a>
        <div className="nav-label">KHÔNG GIAN CỦA BẠN</div>
        <nav aria-label="Điều hướng chính">
          {navigation
            .filter(
              (item) =>
                item[0] !== "admin" ||
                user?.roles?.some((role) => role.name === "admin"),
            )
            .map(([id, icon, title]) => (
              <Link
                href={pagePath(id)}
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                aria-current={page === id ? "page" : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {title}
                {id === "saved" && saved.length > 0 && (
                  <small>{saved.length}</small>
                )}
              </Link>
            ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-sun">☀</span>
          <h3>Đi đâu đó, thật chậm.</h3>
          <p>Một nơi mới. Một trải nghiệm mới. Một chút thời gian cho bạn.</p>
          <button onClick={resetExplore}>
            Tìm cảm hứng <span>↗</span>
          </button>
        </div>
        <div className="sidebar-footer">
          <span className="avatar">
            {user ? user.email.charAt(0).toUpperCase() : "B"}
          </span>
          <div>
            <strong>
              {user ? user.email.split("@")[0] : "Xin chào, bạn!"}
            </strong>
            <small>
              {session
                ? "Sẵn sàng cho hành trình mới"
                : "Bắt đầu hành trình của bạn"}
            </small>
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <span>
            Không gian của bạn <span className="breadcrumb">/</span>{" "}
            <strong>{currentTitle}</strong>
          </span>
          <div>
            <span className="locale">VN · Tiếng Việt</span>
            {session ? (
              <button className="outline" onClick={logout}>
                Đăng xuất
              </button>
            ) : (
              <Link
                className="outline"
                href={{
                  pathname: "/login",
                  query: { next: safeReturnPath(router.asPath) },
                }}
              >
                Đăng nhập <span>↗</span>
              </Link>
            )}
          </div>
        </header>
        <div className="content">
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button aria-label="Đóng thông báo" onClick={() => setNotice("")}>
                ×
              </button>
            </div>
          )}
          {children}
          <Footer />
        </div>
      </main>
    </div>
  );
}
