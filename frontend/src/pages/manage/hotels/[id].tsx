import ManagementGate from "../../../ManagementGate";
import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { api } from "../../../api";
import type { Hotel } from "../../../api";
import HotelWorkspace from "../../../HotelWorkspace";
import { useBooking } from "../../../BookingContext";
export default function ManagedHotel() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  const { session, ready } = useBooking();
  const [hotel, setHotel] = useState<Hotel | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    if (!id || !session) return;
    const c = new AbortController();
    api
      .hotel(id, c.signal)
      .then((h) => {
        if (!c.signal.aborted) setHotel(h);
      })
      .catch((err) => {
        if (!c.signal.aborted)
          setError(
            err instanceof Error ? err.message : "Không tải được khách sạn.",
          );
      });
    return () => c.abort();
  }, [id, session]);
  return (
    <section className="management-page">
      <Head>
        <title>{hotel?.name || "Quản lý phòng"} · booking.</title>
      </Head>
      <Link className="outline" href="/manage" aria-label="Đóng quản lý phòng">
        Quay lại danh sách
      </Link>
      <header className="page-heading">
        <div>
          <h1>{hotel?.name || "Quản lý phòng và nhân sự"}</h1>
          <p>
            {hotel
              ? `${hotel.city}, ${hotel.country} · Quản lý vận hành`
              : "Phòng, tồn kho và đội ngũ khách sạn"}
          </p>
        </div>
      </header>
      {!ready ? (
        <p role="status">Đang khôi phục phiên đăng nhập…</p>
      ) : !session ? (
        <Link
          className="primary"
          href={{ pathname: "/login", query: { next: router.asPath } }}
        >
          Đăng nhập
        </Link>
      ) : error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : (
        id && (
          <ManagementGate hotelId={id}>
            <HotelWorkspace
              key={`${session.token}:${id}`}
              token={session.token}
              id={id}
            />
          </ManagementGate>
        )
      )}
    </section>
  );
}
