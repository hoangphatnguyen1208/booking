import Head from "next/head";
import { useRouter } from "next/router";
import { useBooking } from "./BookingContext";
export default function ProfilePage() {
  const router = useRouter();
  const { session, ready, user, profileError, profileLoading, setSession } =
    useBooking();
  function openAuth(mode = "login") {
    void router.push({ pathname: `/${mode}`, query: { next: "/profile" } });
  }
  return (
    <>
      <Head>
        <title>Tài khoản · booking.</title>
      </Head>
      <span className="eyebrow dark">KHÔNG GIAN CÁ NHÂN</span>
      <h1>Tài khoản của bạn</h1>
      {!ready ? (
        <p role="status">Đang khôi phục phiên đăng nhập…</p>
      ) : !session ? (
        <div className="empty-state">
          <span>◎</span>
          <h2>Mỗi hành trình bắt đầu từ bạn</h2>
          <p>Đăng nhập để xem thông tin tài khoản của bạn.</p>
          <button className="primary" onClick={() => openAuth()}>
            Đăng nhập
          </button>
          <button className="text-button" onClick={() => openAuth("register")}>
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
                    {new Date(user.created_at).toLocaleDateString("vi-VN")}
                  </dd>
                </dl>
                <p>
                  Phiên đăng nhập được lưu trên thiết bị này đến khi hết hạn
                  hoặc bạn đăng xuất.
                </p>
              </>
            )
          )}
        </section>
      )}
    </>
  );
}
