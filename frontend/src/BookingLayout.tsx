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
  ["manage", "⌂", "Vận hành khách sạn"],
  ["admin", "⚙", "Admin"],
] as const;
export default function BookingLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const {
    session,
    saved,
    notice,
    setNotice,
    logout,
    ready,
    canManage,
    access,
  } = useBooking();
  const section = router.pathname.split("/")[1];
  const page =
    !section || section === "hotels"
      ? "explore"
      : pages.includes(section as Page)
        ? section
        : null;
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
        <nav aria-label="Điều hướng chính">
          {navigation
            .filter(
              (item) =>
                (item[0] !== "saved" || !!session) &&
                (item[0] !== "manage" || canManage) &&
                (item[0] !== "admin" || access?.admin),
            )
            .map(([id, icon, title]) => (
              <Link
                href={pagePath(id)}
                key={id}
                className={`nav-item ${id === "manage" ? "operations-nav" : ""} ${page === id ? "active" : ""}`}
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
      </aside>
      <main>
        <header className="topbar">
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
