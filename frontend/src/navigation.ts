export const pages = [
  "explore",
  "saved",
  "trips",
  "profile",
  "manage",
  "admin",
] as const;
export type Page = (typeof pages)[number];

export function pagePath(page: Page) {
  return page === "explore" ? "/" : `/${page}`;
}

export const pageTitles: Record<Page, string> = {
  explore: "Một nơi dành cho bạn",
  saved: "Những nơi bạn yêu thích",
  trips: "Chuyến đi của tôi",
  profile: "Tài khoản",
  manage: "Quản lý khách sạn",
  admin: "Quản trị hệ thống",
};
