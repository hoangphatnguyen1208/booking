import dynamic from "next/dynamic";
import Head from "next/head";
import type { GetStaticPaths, GetStaticProps } from "next";
import { pages, pagePath, pageTitles } from "../navigation";
import type { Page } from "../navigation";

// This shared page preserves the in-memory session during Next.js navigation.
// Storage and HTML dialogs are only initialized in the browser.
const BookingApp = dynamic(() => import("../App"), {
  ssr: false,
  loading: () => <p role="status">Đang tải ứng dụng…</p>,
});

export default function BookingPage({ page }: { page: Page }) {
  return (
    <>
      <Head>
        <title>{pageTitles[page]} · booking.</title>
      </Head>
      <BookingApp page={page} />
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => ({
  paths: pages.map(pagePath),
  fallback: false,
});

export const getStaticProps: GetStaticProps<{ page: Page }> = async ({
  params,
}) => {
  const section = params?.section;
  const page =
    Array.isArray(section) && section.length ? section[0] : "explore";
  if (
    (Array.isArray(section) && section.length > 1) ||
    !pages.includes(page as Page)
  ) {
    return { notFound: true };
  }
  return { props: { page: page as Page } };
};
