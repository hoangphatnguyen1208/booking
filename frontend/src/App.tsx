import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/router";
import { useSession } from "./useSession";
import { pages, pagePath } from "./navigation";
import type { Page } from "./navigation";
import { api, ApiError } from "./api";
import type { User } from "./api";
import { toStay, localDate, readSaved } from "./catalog";
import HotelManager from "./HotelManager";
import BookingPanel from "./BookingPanel";
import Trips from "./Trips";
import AdminPanel from "./AdminPanel";
import { bookingApi } from "./booking-api";
import type { Stay } from "./catalog";

const navigation = [
  ["explore", "⌘", "Khám phá"],
  ["saved", "♡", "Đã lưu"],
  ["trips", "▤", "Chuyến đi của tôi"],
  ["profile", "◎", "Tài khoản"],
  ["manage", "⌂", "Quản lý"],
  ["admin", "⚙", "Admin"],
] as const;
function Artwork({ stay }: { stay: Stay }) {
  return (
    <div className={`stay-art ${stay.style}`} aria-hidden="true">
      {stay.image_url && (
        <img
          src={stay.image_url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}
      <div className="scenery" />
      <div className="cabin">
        <i />
        <b />
      </div>
    </div>
  );
}

export default function App({ page }: { page: Page }) {
  const router = useRouter();
  function setPage(next: Page) {
    void router.push(pagePath(next), undefined, { scroll: false });
  }
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});
  const [searchGuests, setSearchGuests] = useState("2");
  useEffect(() => {
    const change = () => {
      const legacy = window.location.hash.slice(1);
      if (pages.includes(legacy as Page)) {
        void router.replace(pagePath(legacy as Page), undefined, {
          scroll: false,
        });
      }
    };
    change();
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [router]);
  const [saved, setSaved] = useState(readSaved);
  const [stays, setStays] = useState<Stay[]>([]);
  const [savedStays, setSavedStays] = useState<Stay[]>([]);
  const [hotelPage, setHotelPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);
  const [hotelsLoading, setHotelsLoading] = useState(true);
  const [hotelsError, setHotelsError] = useState("");
  const [reload, setReload] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const detailRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setHotelsLoading(true);
      setHotelsError("");
      try {
        if (page === "saved") {
          const results = await Promise.all(
            saved.map(async (id) => {
              try {
                return toStay(await api.hotel(id, controller.signal));
              } catch (error) {
                if (error instanceof ApiError && error.status === 404)
                  return null;
                throw error;
              }
            }),
          );
          if (!controller.signal.aborted)
            setSavedStays(
              results.filter((stay): stay is Stay => stay !== null),
            );
        } else {
          const result = await bookingApi.search(
            hotelPage,
            searchParams,
            controller.signal,
          );
          if (!controller.signal.aborted) {
            setStays(result.items.map(toStay));
            setHasNext(result.items.length === result.limit);
          }
        }
      } catch (error) {
        if (!controller.signal.aborted)
          setHotelsError(
            error instanceof Error
              ? error.message
              : "Không tải được khách sạn.",
          );
      } finally {
        if (!controller.signal.aborted) setHotelsLoading(false);
      }
    }
    if (page === "explore" || page === "saved") void load();
    return () => controller.abort();
  }, [hotelPage, reload, page, saved, searchParams]);
  useEffect(() => () => detailRequest.current?.abort(), []);
  async function openDetail(stay: Stay) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetail(stay);
    setDetailLoading(true);
    setDetailError("");
    try {
      const hotel = await api.hotel(stay.id, controller.signal);
      if (!controller.signal.aborted) setDetail(toStay(hotel));
    } catch (error) {
      if (!controller.signal.aborted)
        setDetailError(
          error instanceof Error ? error.message : "Không tải được chi tiết.",
        );
    } finally {
      if (!controller.signal.aborted) setDetailLoading(false);
    }
  }
  function closeDetail() {
    detailRequest.current?.abort();
    setDetail(null);
  }
  const [category, setCategory] = useState("Tất cả");
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState(localDate(1));
  const [checkOut, setCheckOut] = useState(localDate(3));
  const [searchError, setSearchError] = useState("");
  const { session, setSession } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileLoading, setProfileLoading] = useState(Boolean(session));
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authOpen, setAuthOpen] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [detail, setDetail] = useState<Stay | null>(null);
  const authDialog = useRef<HTMLDialogElement>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);
  const authRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem("booking.saved", JSON.stringify(saved));
    } catch {
      /* Continue with in-memory favorites. */
    }
  }, [saved]);
  useEffect(() => {
    if (authOpen) authDialog.current?.showModal();
    else authDialog.current?.close();
  }, [authOpen]);
  useEffect(() => {
    if (detail) detailDialog.current?.showModal();
    else detailDialog.current?.close();
  }, [detail]);
  useEffect(() => () => authRequest.current?.abort(), []);
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
  useEffect(() => {
    if (!session) {
      // oxlint-disable-next-line react/set-state-in-effect -- Reset cached profile when the persisted session changes.
      setUser(null);
      setProfileError("");
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    setProfileError("");
    const controller = new AbortController();
    api
      .me(session.token, controller.signal)
      .then((user) => {
        if (!controller.signal.aborted) setUser(user);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
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
        if (!controller.signal.aborted) setProfileLoading(false);
      });
    return () => controller.abort();
  }, [session, setSession]);

  function openAuth(mode: "login" | "register" = "login") {
    setAuthMode(mode);
    setAuthError("");
    setAuthMessage("");
    setAuthOpen(true);
  }
  function closeAuth() {
    authRequest.current?.abort();
    setAuthBusy(false);
    setAuthOpen(false);
  }
  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    if (
      authMode === "register" &&
      ([...password].length < 8 ||
        new TextEncoder().encode(password).length > 72)
    ) {
      setAuthError("Mật khẩu cần ít nhất 8 ký tự và tối đa 72 byte.");
      return;
    }
    const controller = new AbortController();
    authRequest.current = controller;
    setAuthBusy(true);
    setAuthError("");
    try {
      if (authMode === "register") {
        await api.register(email, password, controller.signal);
        if (controller.signal.aborted) return;
        setAuthMode("login");
        form.reset();
        setAuthMessage("Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.");
      } else {
        const result = await api.login(email, password, controller.signal);
        if (controller.signal.aborted) return;
        setProfileLoading(true);
        setProfileError("");
        setSession({
          token: result.access_token,
          expiresAt: Date.now() + result.expires_in * 1000,
        });
        setUser(null);
        setNotice("Đăng nhập thành công. Chào mừng bạn trở lại!");
        setAuthOpen(false);
        form.reset();
      }
    } catch (error) {
      if (!controller.signal.aborted)
        setAuthError(
          error instanceof Error
            ? error.message
            : "Có lỗi xảy ra. Vui lòng thử lại.",
        );
    } finally {
      if (!controller.signal.aborted) setAuthBusy(false);
    }
  }
  function search(event: FormEvent) {
    event.preventDefault();
    if (checkIn < localDate() || checkOut <= checkIn) {
      setSearchError(
        "Ngày nhận phòng phải từ hôm nay; ngày trả phòng phải sau ngày nhận phòng.",
      );
      return;
    }
    setSearchError("");
    setHotelPage(1);
    setSearchParams({
      destination: destination.trim(),
      check_in: checkIn,
      check_out: checkOut,
      rooms: "1",
      guests: searchGuests,
    });
    setCategory("Tất cả");
  }
  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  function resetExplore() {
    setPage("explore");
    setDestination("");
    setSearchParams({});
    setHotelPage(1);
    setCategory("Tất cả");
  }
  const visible = (page === "saved" ? savedStays : stays).filter(
    (stay) => (page !== "saved" || saved.includes(stay.id)) && true,
  );

  return (
    <div className="app-shell">
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
              <button
                key={id}
                className={`nav-item ${page === id ? "active" : ""}`}
                onClick={() => setPage(id)}
                aria-current={page === id ? "page" : undefined}
              >
                <span aria-hidden="true">{icon}</span>
                {title}
                {id === "saved" && saved.length > 0 && (
                  <small>{saved.length}</small>
                )}
              </button>
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
            <strong>{navigation.find((item) => item[0] === page)?.[2]}</strong>
          </span>
          <div>
            <span className="locale">VN · Tiếng Việt</span>
            {session ? (
              <button
                className="outline"
                onClick={() => {
                  setSession(null);
                  setUser(null);
                  setProfileError("");
                  setNotice("Bạn đã đăng xuất.");
                }}
              >
                Đăng xuất
              </button>
            ) : (
              <button className="outline" onClick={() => openAuth()}>
                Đăng nhập <span>↗</span>
              </button>
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
          {page === "explore" && (
            <>
              <section className="hero">
                <div className="hero-content">
                  <span className="eyebrow">NHỮNG CHUYẾN ĐI ĐÁNG NHỚ</span>
                  <h1>
                    Đổi một nơi ở.
                    <br />
                    <em>Thêm một câu chuyện.</em>
                  </h1>
                  <p>Tìm một chốn dừng chân khiến bạn muốn ở lại lâu hơn.</p>
                  <span className="hero-caption">
                    Chạm vào bình yên, theo cách của bạn.
                  </span>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="sun" />
                  <div className="mountain far" />
                  <div className="mountain near" />
                  <div className="water" />
                  <div className="house">
                    <i />
                    <b />
                  </div>
                  <div className="tree" />
                  <div className="art-label">
                    a little escape
                    <br />
                    <span>VIETNAM, WITH LOVE</span>
                  </div>
                </div>
              </section>
              <form className="search-panel" onSubmit={search}>
                <label>
                  <span>ĐIỂM ĐẾN</span>
                  <input
                    aria-label="Điểm đến"
                    placeholder="Bạn muốn đi đâu?"
                    value={destination}
                    onChange={(event) => setDestination(event.target.value)}
                  />
                </label>
                <label>
                  <span>NHẬN PHÒNG</span>
                  <input
                    aria-label="Ngày nhận phòng"
                    type="date"
                    min={localDate()}
                    required
                    value={checkIn}
                    onChange={(event) => setCheckIn(event.target.value)}
                  />
                </label>
                <label>
                  <span>TRẢ PHÒNG</span>
                  <input
                    aria-label="Ngày trả phòng"
                    type="date"
                    min={checkIn}
                    required
                    value={checkOut}
                    onChange={(event) => setCheckOut(event.target.value)}
                  />
                </label>
                <label>
                  <span>DU KHÁCH</span>
                  <select
                    aria-label="Số khách"
                    value={searchGuests}
                    onChange={(e) => setSearchGuests(e.target.value)}
                  >
                    <option value="1">1 người lớn</option>
                    <option value="2">2 người lớn</option>
                    <option value="3">3 người lớn</option>
                    <option value="4">4 người lớn</option>
                  </select>
                </label>
                <button className="primary" type="submit">
                  Tìm nơi ở <span>→</span>
                </button>
              </form>
              {searchError && (
                <p className="error" role="alert">
                  {searchError}
                </p>
              )}
              <div className="section-heading">
                <div>
                  <span className="eyebrow dark">ĐI THEO CẢM HỨNG</span>
                  <h2>Một nơi dành cho bạn</h2>
                  <p>Những không gian nhỏ, cho những trải nghiệm lớn.</p>
                </div>
                <span className="sample-badge">
                  Khách sạn · trang {hotelPage}
                </span>
              </div>
              <div className="filters" aria-label="Loại nơi ở">
                {["Tất cả", "3 sao", "4 sao", "5 sao"].map((item, index) => (
                  <button
                    key={item}
                    className={category === item ? "selected" : ""}
                    aria-pressed={category === item}
                    onClick={() => {
                      setCategory(item);
                      setHotelPage(1);
                      setSearchParams((current) => ({
                        ...current,
                        rank: item === "Tất cả" ? "" : item[0],
                      }));
                    }}
                  >
                    <span aria-hidden="true">
                      {["✧", "♧", "≈", "⌂"][index]}
                    </span>
                    {item}
                  </button>
                ))}
              </div>
            </>
          )}
          {page === "saved" && (
            <div className="section-heading">
              <div>
                <span className="eyebrow dark">CHO CHUYẾN ĐI TIẾP THEO</span>
                <h1>Những nơi bạn yêu thích</h1>
                <p>Khách sạn bạn đã lưu trên thiết bị này.</p>
              </div>
              <span className="sample-badge">{saved.length} nơi đã lưu</span>
            </div>
          )}
          {(page === "explore" || page === "saved") && (
            <>
              {hotelsLoading && <p role="status">Đang tải khách sạn…</p>}
              {hotelsError && (
                <div className="empty-state">
                  <p className="error" role="alert">
                    {hotelsError}
                  </p>
                  <button
                    className="outline"
                    onClick={() => setReload((value) => value + 1)}
                  >
                    Thử lại
                  </button>
                </div>
              )}
              {!hotelsLoading && !hotelsError && (
                <>
                  <div className="stay-grid">
                    {visible.map((stay) => (
                      <article className="stay-card" key={stay.id}>
                        <div className="art-wrapper">
                          <Artwork stay={stay} />
                          <span className="stay-tag">{stay.category}</span>
                          <button
                            className={`save-button ${saved.includes(stay.id) ? "is-saved" : ""}`}
                            aria-label={`${saved.includes(stay.id) ? "Bỏ lưu" : "Lưu"} ${stay.name}`}
                            aria-pressed={saved.includes(stay.id)}
                            onClick={() => toggleSaved(stay.id)}
                          >
                            {saved.includes(stay.id) ? "♥" : "♡"}
                          </button>
                        </div>
                        <div className="stay-meta">
                          <span>
                            {stay.city}, {stay.country}
                          </span>
                          <span className="rating">★ {stay.rating}</span>
                        </div>
                        <button
                          className="stay-title"
                          onClick={() => void openDetail(stay)}
                        >
                          {stay.name} <span>↗</span>
                        </button>
                        <p>{stay.description}</p>
                        <div className="stay-price">
                          <span>Chưa có thông tin giá phòng</span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {visible.length === 0 && (
                    <div className="empty-state">
                      <span>⌕</span>
                      <h2>
                        {page === "saved"
                          ? "Chưa có nơi nào được lưu"
                          : "Chưa tìm thấy nơi phù hợp"}
                      </h2>
                      <p>
                        {page === "saved"
                          ? "Nhấn biểu tượng trái tim để lưu nơi bạn thích."
                          : "Không có khách sạn phù hợp trên trang này. Thử trang khác hoặc bỏ bộ lọc."}
                      </p>
                      <button className="outline" onClick={resetExplore}>
                        Khám phá tất cả
                      </button>
                    </div>
                  )}
                </>
              )}
              {page === "explore" && (
                <div className="pagination">
                  <button
                    className="outline"
                    disabled={hotelPage === 1 || hotelsLoading}
                    onClick={() => setHotelPage((value) => value - 1)}
                  >
                    ← Trang trước
                  </button>
                  <span>Trang {hotelPage}</span>
                  <button
                    className="outline"
                    disabled={!hasNext || hotelsLoading || !!hotelsError}
                    onClick={() => setHotelPage((value) => value + 1)}
                  >
                    Trang sau →
                  </button>
                </div>
              )}
              <div className="collection-note">
                <span>ⓘ</span> Dữ liệu khách sạn từ hệ thống. Hình vẽ chỉ mang
                tính minh họa. Tìm kiếm kiểm tra phòng trống trên toàn hệ thống.
                Giá và tồn phòng được xác nhận lại khi gửi đơn.
              </div>
            </>
          )}
          {page === "manage" && (
            <HotelManager
              token={session?.token ?? null}
              onLogin={() => openAuth()}
              onChanged={() => setReload((value) => value + 1)}
              onUnauthorized={() => {
                setSession(null);
                setUser(null);
                setNotice(
                  "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
                );
              }}
            />
          )}
          {page === "trips" && (
            <Trips token={session?.token ?? null} onLogin={() => openAuth()} />
          )}
          {page === "admin" && <AdminPanel token={session?.token ?? null} />}
          {page === "profile" && (
            <>
              <span className="eyebrow dark">KHÔNG GIAN CÁ NHÂN</span>
              <h1>Tài khoản của bạn</h1>
              {!session ? (
                <div className="empty-state">
                  <span>◎</span>
                  <h2>Mỗi hành trình bắt đầu từ bạn</h2>
                  <p>Đăng nhập để xem thông tin tài khoản của bạn.</p>
                  <button className="primary" onClick={() => openAuth()}>
                    Đăng nhập →
                  </button>
                  <button
                    className="text-button"
                    onClick={() => openAuth("register")}
                  >
                    Tạo tài khoản mới
                  </button>
                </div>
              ) : (
                <section className="profile-card" aria-busy={profileLoading}>
                  {profileLoading ? (
                    <p role="status">Đang tải hồ sơ…</p>
                  ) : profileError ? (
                    <>
                      <p className="error" role="alert">
                        {profileError}
                      </p>
                      <button
                        className="outline"
                        onClick={() => {
                          setProfileLoading(true);
                          setProfileError("");
                          setSession({ ...session });
                        }}
                      >
                        Thử lại
                      </button>
                    </>
                  ) : (
                    user && (
                      <>
                        <span className="avatar large">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                        <h2>Chào mừng bạn trở lại</h2>
                        <dl>
                          <dt>Email</dt>
                          <dd>{user.email}</dd>
                          <dt>Mã tài khoản</dt>
                          <dd>{user.id}</dd>
                          <dt>Ngày tham gia</dt>
                          <dd>
                            {new Date(user.created_at).toLocaleDateString(
                              "vi-VN",
                            )}
                          </dd>
                        </dl>
                        <p>
                          Phiên đăng nhập được lưu trên thiết bị này đến khi hết
                          hạn hoặc bạn đăng xuất.
                        </p>
                      </>
                    )
                  )}
                </section>
              )}
            </>
          )}
          <footer className="footer">
            <span className="footer-brand">booking.</span>
            <span>Những nơi ở đẹp. Những kỷ niệm dài lâu.</span>
            <small>Made for your next chapter.</small>
          </footer>
        </div>
      </main>
      <dialog
        ref={authDialog}
        onCancel={closeAuth}
        onClose={() => setAuthOpen(false)}
        aria-labelledby="auth-title"
      >
        <button className="dialog-close" aria-label="Đóng" onClick={closeAuth}>
          ×
        </button>
        <span className="brand-icon">b.</span>
        <h2 id="auth-title">
          {authMode === "login"
            ? "Chào mừng bạn trở lại"
            : "Bắt đầu một hành trình mới"}
        </h2>
        <p>
          {authMode === "login"
            ? "Đăng nhập vào không gian của bạn."
            : "Tạo tài khoản để khám phá cùng booking."}
        </p>
        <>
          {authMessage && (
            <div className="notice" role="status">
              {authMessage}
            </div>
          )}
        </>
        <form onSubmit={authenticate}>
          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="ban@example.com"
              required
              disabled={authBusy}
            />
          </label>
          <label>
            Mật khẩu
            <input
              name="password"
              type="password"
              autoComplete={
                authMode === "login" ? "current-password" : "new-password"
              }
              required
              disabled={authBusy}
            />
          </label>
          {authMode === "register" && (
            <small>Ít nhất 8 ký tự, tối đa 72 byte.</small>
          )}
          {authError && (
            <p className="error" role="alert">
              {authError}
            </p>
          )}
          <button className="primary" disabled={authBusy}>
            {authBusy
              ? "Đang xử lý…"
              : authMode === "login"
                ? "Đăng nhập →"
                : "Tạo tài khoản →"}
          </button>
        </form>
        <button
          className="text-button"
          disabled={authBusy}
          onClick={() => {
            setAuthMode(authMode === "login" ? "register" : "login");
            setAuthError("");
          }}
        >
          {authMode === "login"
            ? "Chưa có tài khoản? Đăng ký"
            : "Đã có tài khoản? Đăng nhập"}
        </button>
      </dialog>
      <dialog
        className="hotel-detail-dialog"
        ref={detailDialog}
        onCancel={closeDetail}
        onClose={closeDetail}
        aria-labelledby="detail-title"
      >
        <button
          className="dialog-close"
          aria-label="Đóng"
          onClick={closeDetail}
        >
          ×
        </button>
        {detail && (
          <>
            <span className="sample-badge">Thông tin khách sạn</span>
            <h2 id="detail-title">{detail.name}</h2>
            <p>
              {detail.city}, {detail.country} · {detail.rating}
            </p>
            <Artwork stay={detail} />
            <div className="filters">
              {detail.amenities?.map((item) => (
                <span className="sample-badge" key={item}>
                  {item}
                </span>
              ))}
            </div>
            {detailLoading ? (
              <p role="status">Đang tải chi tiết…</p>
            ) : detailError ? (
              <>
                <p className="error" role="alert">
                  {detailError}
                </p>
                <button
                  className="outline"
                  onClick={() => void openDetail(detail)}
                >
                  Thử lại
                </button>
              </>
            ) : (
              <p>{detail.description}</p>
            )}
            <p>Chưa có thông tin giá phòng</p>
            <div className="collection-note">
              Thanh toán tại khách sạn. Giá và tồn phòng được kiểm tra lại khi
              đặt.
            </div>
            {!detailLoading && !detailError && (
              <BookingPanel
                key={detail.id}
                hotelId={detail.id}
                token={session?.token ?? null}
                onLogin={() => openAuth()}
                onTrips={() => {
                  closeDetail();
                  setPage("trips");
                }}
              />
            )}
            <button className="primary" onClick={() => toggleSaved(detail.id)}>
              {saved.includes(detail.id)
                ? "Bỏ lưu nơi ở"
                : "Lưu cho chuyến đi sau"}
            </button>
          </>
        )}
      </dialog>
    </div>
  );
}
