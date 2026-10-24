import { test, expect } from "@playwright/test";

const id = "11111111-1111-1111-1111-111111111111";
const hotel = {
  id,
  name: "Private stay",
  slug: "private",
  city: "Hue",
  country: "VN",
  rank: 4,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/hotels?*", (route) =>
    route.fulfill({ json: { items: [hotel], page: 1, limit: 20 } }),
  );
  await page.route("**/api/v1/hotels/*", (route) =>
    route.fulfill({ json: hotel }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({
      json: {
        id: route.request().headers().authorization,
        email: "guest@example.com",
      },
    }),
  );
});

test("guest cannot view or change saved hotels even with legacy browser data", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/me/saved-hotels**", (route) => {
    requests++;
    return route.fulfill({ json: [] });
  });
  await page.addInitScript(
    (hotelId) =>
      localStorage.setItem("booking.saved", JSON.stringify([hotelId])),
    id,
  );
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Đã lưu/ })).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Lưu Private stay", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Lưu Private stay", exact: true })
    .click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "Đăng nhập để xem những nơi đã lưu" }),
  ).toBeVisible();
  await expect(page.locator(".stay-card")).toHaveCount(0);
  expect(requests).toBe(0);
});

test("saved hotels persist on the server and are isolated across logout and account changes", async ({
  page,
}) => {
  const saved = new Map<string, string[]>([
    ["Bearer first", [id]],
    ["Bearer second", []],
  ]);
  await page.route("**/api/v1/me/saved-hotels**", (route) => {
    const actor = route.request().headers().authorization;
    const method = route.request().method();
    expect(actor).toMatch(/^Bearer (first|second)$/);
    if (method === "PUT") saved.set(actor, [id]);
    if (method === "DELETE") saved.set(actor, []);
    return route.fulfill({
      json: method === "GET" ? saved.get(actor) : { message: "ok" },
    });
  });
  await page.goto("/");
  async function switchAccount(token: string) {
    await page.evaluate((value) => {
      localStorage.setItem(
        "booking.session",
        JSON.stringify({ token: value, expiresAt: Date.now() + 3600000 }),
      );
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: "booking.session",
          storageArea: localStorage,
        }),
      );
    }, token);
  }
  await switchAccount("first");
  await page.getByRole("link", { name: /Đã lưu/ }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(page.locator(".stay-card")).toHaveCount(0);
  await expect(page.getByRole("link", { name: /Đã lưu/ })).toHaveCount(0);
  await switchAccount("second");
  await expect(
    page.getByRole("heading", { name: "Chưa có nơi nào được lưu" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Khám phá tất cả", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Lưu Private stay", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu Private stay", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Bỏ lưu Private stay", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Bỏ lưu Private stay", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Lưu Private stay", exact: true }),
  ).toBeVisible();
  expect(saved.get("Bearer first")).toEqual([id]);
  expect(saved.get("Bearer second")).toEqual([]);
});
