import Head from "next/head";
import { useRouter } from "next/router";
import Trips from "../Trips";
import { useBooking } from "../BookingContext";
export default function TripsPage() {
  const router = useRouter();
  const { session, ready } = useBooking();
  return (
    <>
      <Head>
        <title>Chuyến đi của tôi · booking.</title>
      </Head>
      {!ready ? (
        <>
          <h1>Chuyến đi của tôi</h1>
          <p role="status">Đang khôi phục phiên đăng nhập…</p>
        </>
      ) : (
        <Trips
          token={session?.token ?? null}
          onLogin={() => void router.push("/login?next=/trips")}
        />
      )}
    </>
  );
}
