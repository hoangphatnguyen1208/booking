import Head from "next/head";
import AdminPanel from "../AdminPanel";
import { useBooking } from "../BookingContext";
export default function AdminPage() {
  const { session, ready } = useBooking();
  return (
    <>
      <Head>
        <title>Quản trị hệ thống · booking.</title>
      </Head>
      {!ready ? (
        <>
          <h1>Quản trị hệ thống</h1>
          <p role="status">Đang khôi phục phiên đăng nhập…</p>
        </>
      ) : (
        <AdminPanel token={session?.token ?? null} />
      )}
    </>
  );
}
