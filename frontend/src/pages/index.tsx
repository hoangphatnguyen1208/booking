import dynamic from "next/dynamic";

// The booking UI uses browser storage and dialogs; keep it on the client.
const BookingApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => <p role="status">Đang tải ứng dụng…</p>,
});

export default function Home() {
  return <BookingApp />;
}
