import { test, expect } from "@playwright/test";

test("customer has no operations links and direct management URLs are blocked", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "booking.session",
      JSON.stringify({ token: "customer", expiresAt: Date.now() + 3600000 }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: { id: "customer", email: "customer@example.com" } }),
  );
  await page.route("**/api/v1/me/access", (route) =>
    route.fulfill({ json: { admin: false, hotels: [] } }),
  );
  await page.route("**/api/v1/me/saved-hotels", (route) =>
    route.fulfill({ json: [] }),
  );
  await page.route("**/api/v1/hotels/*", (route) =>
    route.fulfill({
      json: { id: "11111111-1111-1111-1111-111111111111", name: "Hotel" },
    }),
  );
  let writes = 0;
  await page.route("**/api/v1/me/hotels*", (route) => {
    writes++;
    return route.fulfill({ json: { items: [] } });
  });
  await page.goto("/manage");
  await expect(
    page.getByRole("heading", { name: "Bạn chưa được cấp quyền quản lý" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", {
      name: /Vận hành khách sạn|Quản lý khách sạn|Admin/,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Thêm khách sạn/ }),
  ).toHaveCount(0);
  await page.goto("/manage/hotels/11111111-1111-1111-1111-111111111111");
  await expect(
    page.getByRole("heading", { name: "Bạn chưa được cấp quyền quản lý" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Loại phòng mới|Cập nhật quyền/ }),
  ).toHaveCount(0);
  await page.goto("/admin");
  await expect(
    page.getByRole("heading", { name: "Bạn chưa được cấp quyền quản lý" }),
  ).toBeVisible();
  expect(writes).toBe(0);
});
