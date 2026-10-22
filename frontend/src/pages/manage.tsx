import Head from "next/head";
import { useRouter } from "next/router";
import HotelManager from "../HotelManager";
import { useBooking } from "../BookingContext";
export default function Manage() {
  const router = useRouter();
  const { session, setSession, setNotice, ready } = useBooking();
  return (
    <>
      <Head>
        <title>Quản lý khách sạn · booking.</title>
      </Head>
      {!ready ? (
        <>
          <h1>Quản lý khách sạn</h1>
          <p role="status">Đang khôi phục phiên đăng nhập…</p>
        </>
      ) : (
        <HotelManager
          token={session?.token ?? null}
          onLogin={() => void router.push("/login?next=/manage")}
          onUnauthorized={() => {
            setSession(null);
            setNotice(
              "Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.",
            );
          }}
        />
      )}
    </>
  );
}
