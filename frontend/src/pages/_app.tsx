import type { AppProps } from "next/app";
import Head from "next/head";
import { BookingProvider } from "../BookingProvider";
import BookingLayout from "../BookingLayout";
import "../index.css";
import "../App.css";

export default function BookingApplication({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>booking. — Một nơi dành cho bạn</title>
        <meta
          name="description"
          content="Khám phá những nơi ở đẹp cùng booking. Đăng nhập, lưu cảm hứng và chuẩn bị cho hành trình tiếp theo."
        />
        <meta name="theme-color" content="#2d5846" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      </Head>
      <BookingProvider>
        <BookingLayout>
          <Component {...pageProps} />
        </BookingLayout>
      </BookingProvider>
    </>
  );
}
