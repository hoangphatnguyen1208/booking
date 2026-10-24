import { test, expect } from "@playwright/test";

test("public content, search and hotel details are HTML with JavaScript disabled", async ({
  page,
}) => {
  await page.goto("/?destination=Hu%E1%BA%BF&rank=4");
  await expect(
    page.getByRole("heading", { name: /Đổi một nơi ở/ }),
  ).toBeVisible();
  const hotel = page.getByRole("link", { name: "SSR Hotel Huế" });
  await expect(hotel).toBeVisible();
  await hotel.click();
  await expect(page).toHaveURL(
    /\/hotels\/99999999-9999-4999-8999-999999999999$/,
  );
  await expect(
    page.getByRole("heading", { name: "SSR Hotel Huế", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Số 1 đường Lê Lợi", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Kiểm tra phòng trống", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "SSR Hotel Huế", exact: true }),
  ).toBeVisible();
  await page.goto("/?destination=empty");
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy nơi phù hợp" }),
  ).toBeVisible();
  const missing = await page.goto(
    "/hotels/88888888-8888-4888-8888-888888888888",
  );
  expect(missing?.status()).toBe(404);
});

test("each route renders its own page without loading the former SPA", async ({
  page,
}) => {
  for (const [path, title] of [
    ["/saved", "Những nơi bạn yêu thích"],
    ["/profile", "Tài khoản của bạn"],
    ["/manage", "Quản lý khách sạn"],
    ["/trips", "Chuyến đi của tôi"],
    ["/admin", "Quản trị hệ thống"],
    ["/login", "Chào mừng bạn trở lại"],
    ["/register", "Bắt đầu một hành trình mới"],
    [
      "/manage/hotels/99999999-9999-4999-8999-999999999999",
      "Quản lý phòng và nhân sự",
    ],
    ["/trips/99999999-9999-4999-8999-999999999999", "Chi tiết đơn"],
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Đang tải ứng dụng…", { exact: true }),
    ).toHaveCount(0);
  }
});
