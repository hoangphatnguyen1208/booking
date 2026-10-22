import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const hotels = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "An Nhiên Retreat",
    slug: "an-nhien",
    city: "Đà Lạt",
    country: "VN",
    address: "Rừng thông",
    rank: 3,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "The Coast House",
    slug: "coast",
    city: "Đà Nẵng",
    country: "VN",
    address: "Bên biển",
    rank: 4,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Mây Boutique Stay",
    slug: "may",
    city: "Hội An",
    country: "VN",
    address: "Phố cổ",
    rank: 5,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];
test.beforeEach(async ({ page }) => {
  await page.route("**/api/v1/hotels?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const destination = (params.get("destination") || "").toLocaleLowerCase(
      "vi",
    );
    const rank = Number(params.get("rank"));
    const items = hotels.filter(
      (h) =>
        (!rank || h.rank === rank) &&
        (!destination ||
          (h.city + " " + h.name)
            .toLocaleLowerCase("vi")
            .includes(destination)),
    );
    return route.fulfill({ json: { items, page: 1, limit: 20 } });
  });
  await page.route("**/api/v1/me/hotels?*", (route) =>
    route.fulfill({ json: { items: hotels, page: 1, limit: 20 } }),
  );
  await page.route("**/api/v1/hotels/*", (route) => {
    const hotel = hotels.find((item) =>
      route.request().url().endsWith(item.id),
    );
    return route.fulfill(
      hotel
        ? { json: hotel }
        : { status: 404, json: { error: "Hotel not found" } },
    );
  });
});

const user = {
  id: "test-user",
  email: "guest@example.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
test("stay dates use hotel timezone across the UTC midnight boundary", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-10-17T18:00:00Z") });
  await page.goto("/");
  await expect(page.getByLabel("Ngày nhận phòng", { exact: true })).toHaveValue(
    "2026-10-19",
  );
  await expect(page.getByLabel("Ngày trả phòng", { exact: true })).toHaveValue(
    "2026-10-21",
  );
});
async function login(page: Page) {
  await page.getByRole("button", { name: "Đăng nhập ↗" }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Đăng nhập →", exact: true })
    .click();
}
test("search, category, favorite persistence and detail dialog", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /Đổi một nơi ở/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "4 sao", exact: true }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Lưu The Coast House", exact: true })
    .click();
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await page.getByRole("button", { name: "The Coast House ↗" }).click();
  await expect(page.getByRole("dialog")).toContainText("Kiểm tra phòng trống");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Khám phá", exact: true }).click();
  await page.getByLabel("Điểm đến", { exact: true }).fill("Hội An");
  await page.getByRole("button", { name: "Tìm nơi ở" }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "Mây Boutique Stay ↗" }),
  ).toBeVisible();
  await page.getByLabel("Điểm đến", { exact: true }).fill("Không tồn tại");
  await page.getByRole("button", { name: "Tìm nơi ở" }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy nơi phù hợp" }),
  ).toBeVisible();
});
test("registration validates password and switches to login after success", async ({
  page,
}) => {
  let payload: unknown;
  await page.route("**/api/v1/auth/register", async (route) => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: user });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập ↗" }).click();
  await page
    .getByRole("button", { name: "Chưa có tài khoản? Đăng ký" })
    .click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
  await expect(page.locator(".app-shell").getByRole("alert")).toContainText(
    "ít nhất 8 ký tự",
  );
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Tạo tài khoản →" }).click();
  await expect(page.getByRole("dialog")).toContainText("Chào mừng bạn trở lại");
  expect(payload).toEqual({ email: user.email, password: "test-password" });
});
test("login uses bearer token, profile loads and logout clears access", async ({
  page,
}) => {
  let authorization: string | undefined;
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    }),
  );
  await page.route("**/api/v1/auth/me", async (route) => {
    authorization = route.request().headers().authorization;
    await route.fulfill({ json: user });
  });
  await page.goto("/");
  await login(page);
  await page.getByRole("button", { name: "Tài khoản", exact: true }).click();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  expect(authorization).toBe("Bearer test-token");
  await page.reload();
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  expect(authorization).toBe("Bearer test-token");
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await expect(page).toHaveURL(/\/saved$/);
  await page.goBack();
  await expect(page).toHaveURL(/\/profile$/);
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("booking.session")!),
    ),
  ).toMatchObject({ token: "test-token" });
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mỗi hành trình bắt đầu từ bạn" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("booking.session")),
  ).toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "Đăng nhập ↗" })).toBeVisible();
});

test("Next.js supports direct links, legacy hashes and unknown-route 404", async ({
  page,
}) => {
  await page.goto("/saved");
  await expect(
    page.getByRole("heading", { name: "Những nơi bạn yêu thích" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Những nơi bạn yêu thích · booking.");
  await page.reload();
  await expect(page.getByRole("button", { name: /Đã lưu/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goto("/#manage");
  await expect(page).toHaveURL(/\/manage$/);
  await expect(page.getByRole("button", { name: /Quản lý/ })).toHaveAttribute(
    "aria-current",
    "page",
  );
  const response = await page.goto("/unknown/route");
  expect(response?.status()).toBe(404);
});
test("invalid login and network failure show recoverable errors", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({ status: 400, json: { error: "Invalid credentials" } }),
  );
  await page.goto("/");
  await login(page);
  await expect(page.locator(".app-shell").getByRole("alert")).toContainText(
    "Email hoặc mật khẩu không đúng",
  );
  await page.route("**/api/v1/auth/login", (route) => route.abort());
  await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
  await expect(page.locator(".app-shell").getByRole("alert")).toContainText(
    "Không kết nối được máy chủ",
  );
  await expect(
    page.getByRole("button", { name: "Đăng nhập →", exact: true }),
  ).toBeEnabled();
});
test("unauthorized profile clears session", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        access_token: "expired-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ status: 401, json: { error: "Invalid token" } }),
  );
  await page.goto("/");
  await login(page);
  await expect(page.getByRole("status")).toContainText("không còn hợp lệ");
  await expect(page.getByRole("button", { name: "Đăng nhập ↗" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("booking.session")),
  ).toBeNull();
});
test("token expiry requires signing in again", async ({ page }) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        access_token: "short-token",
        token_type: "Bearer",
        expires_in: 1,
      },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.goto("/");
  await login(page);
  await expect(page.getByRole("status")).toContainText(
    "Phiên đăng nhập đã hết hạn",
  );
  await expect(page.getByRole("button", { name: "Đăng nhập ↗" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("booking.session")),
  ).toBeNull();
});

test("expired or corrupt stored sessions are discarded without sending a token", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/v1/auth/me", (route) => {
    requests++;
    return route.fulfill({ json: user });
  });
  for (const value of [
    "invalid json",
    JSON.stringify({ token: "expired", expiresAt: 1 }),
    JSON.stringify({ token: 123, expiresAt: Date.now() + 60000 }),
  ]) {
    await page.addInitScript(
      (value) => localStorage.setItem("booking.session", value),
      value,
    );
    await page.goto("/profile");
    await expect(
      page.getByRole("button", { name: "Đăng nhập ↗" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => localStorage.getItem("booking.session")),
    ).toBeNull();
  }
  expect(requests).toBe(0);
});

test("401 on a booking API clears the restored session", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "booking.session",
      JSON.stringify({ token: "revoked-token", expiresAt: Date.now() + 60000 }),
    ),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/api/v1/bookings?*", (route) =>
    route.fulfill({ status: 401, json: { error: "Invalid token" } }),
  );
  await page.goto("/trips");
  await expect(page.getByRole("button", { name: "Đăng nhập ↗" })).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("booking.session")),
  ).toBeNull();
});

test("logout synchronizes across tabs", async ({ page, context }) => {
  await page.goto("/profile");
  await page.evaluate(() =>
    localStorage.setItem(
      "booking.session",
      JSON.stringify({ token: "shared-token", expiresAt: Date.now() + 60000 }),
    ),
  );
  await context.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.reload();
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  const other = await context.newPage();
  await other.goto("/profile");
  await expect(
    other.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    other.getByRole("button", { name: "Đăng nhập ↗" }),
  ).toBeVisible();
  expect(
    await other.evaluate(() => localStorage.getItem("booking.session")),
  ).toBeNull();
  await other.close();
});

test("login still works when localStorage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        access_token: "memory-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.goto("/profile");
  await login(page);
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
});
test("desktop and mobile preview", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.locator(".stay-card")).toHaveCount(3);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});

test("hotel list failure can retry and empty database stays empty", async ({
  page,
}) => {
  await page.route("**/api/v1/hotels?*", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator(".app-shell").getByRole("alert")).toContainText(
    "Không kết nối",
  );
  await expect(page.locator(".stay-card")).toHaveCount(0);
  await page.route("**/api/v1/hotels?*", (route) =>
    route.fulfill({ json: { items: [], page: 1, limit: 20 } }),
  );
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa tìm thấy nơi phù hợp" }),
  ).toBeVisible();
  await expect(page.locator(".stay-card")).toHaveCount(0);
});

test("management creates updates and deletes using authenticated API", async ({
  page,
}) => {
  let collection = [...hotels];
  await page.route("**/api/v1/me/hotels?*", (route) =>
    route.fulfill({ json: { items: collection, page: 1, limit: 20 } }),
  );
  let method = "";
  let header = "";
  let body: Record<string, unknown> = {};
  await page.route("**/api/v1/hotels?*", (route) =>
    route.fulfill({ json: { items: collection, page: 1, limit: 20 } }),
  );
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      json: {
        access_token: "test-token",
        token_type: "Bearer",
        expires_in: 3600,
      },
    }),
  );
  await page.route("**/api/v1/auth/me", (route) =>
    route.fulfill({ json: user }),
  );
  await page.route("**/api/v1/hotels", async (route) => {
    method = route.request().method();
    header = route.request().headers().authorization;
    body = route.request().postDataJSON();
    const hotel = {
      ...hotels[0],
      ...body,
      id: "44444444-4444-4444-4444-444444444444",
    };
    collection = [hotel, ...collection];
    await route.fulfill({ status: 201, json: hotel });
  });
  await page.route(
    "**/api/v1/hotels/44444444-4444-4444-4444-444444444444",
    async (route) => {
      method = route.request().method();
      header = route.request().headers().authorization;
      if (method === "DELETE") {
        collection = collection.filter(
          (hotel) => hotel.id !== "44444444-4444-4444-4444-444444444444",
        );
        await route.fulfill({ json: { message: "deleted" } });
      } else {
        body = route.request().postDataJSON();
        const hotel = { ...collection[0], ...body };
        collection = [hotel, ...collection.slice(1)];
        await route.fulfill({ json: hotel });
      }
    },
  );
  await page.goto("/");
  await login(page);
  await page.getByRole("button", { name: "Quản lý", exact: true }).click();
  await page
    .getByRole("button", { name: "+ Thêm khách sạn", exact: true })
    .click();
  await page.getByLabel("Tên khách sạn", { exact: true }).fill("Hotel mới");
  await page.getByLabel("Slug", { exact: true }).fill("hotel-moi");
  await page.getByLabel("Thành phố", { exact: true }).fill("Huế");
  await page.getByLabel("Quốc gia", { exact: true }).fill("VN");
  await page
    .getByRole("button", { name: "Tạo khách sạn", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã tạo" }),
  ).toContainText("Đã tạo");
  expect(method).toBe("POST");
  expect(header).toBe("Bearer test-token");
  await page
    .getByRole("button", { name: "Sửa Hotel mới", exact: true })
    .click();
  await page.getByLabel("Tên khách sạn", { exact: true }).fill("Hotel sửa");
  await page.getByRole("button", { name: "Lưu thay đổi", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã cập nhật" }),
  ).toContainText("Đã cập nhật");
  expect(method).toBe("PUT");
  expect(body.address).toBe("");
  expect(body.rank).toBe(0);
  await page
    .getByRole("button", { name: "Xóa Hotel sửa", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Xác nhận xóa" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xác nhận xóa" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Đã xóa" }),
  ).toContainText("Đã xóa");
  expect(method).toBe("DELETE");
  expect(header).toBe("Bearer test-token");
  await expect(
    page.getByRole("button", { name: "Xóa Hotel sửa", exact: true }),
  ).toHaveCount(0);
});

test("hotel pagination requests the next API page", async ({ page }) => {
  await page.route("**/api/v1/hotels?*", (route) => {
    const number = Number(
      new URL(route.request().url()).searchParams.get("page"),
    );
    return route.fulfill({
      json: {
        items:
          number === 1
            ? Array.from({ length: 20 }, (_, i) => ({
                ...hotels[0],
                id: `11111111-1111-1111-1111-${String(i).padStart(12, "0")}`,
              }))
            : [hotels[1]],
        page: number,
        limit: 20,
      },
    });
  });
  await page.goto("/");
  await expect(page.locator(".stay-card")).toHaveCount(20);
  await page.getByRole("button", { name: "Trang sau →", exact: true }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await expect(
    page.getByRole("button", { name: "The Coast House ↗" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Trang sau →", exact: true }),
  ).toBeDisabled();
});

test("deleted saved hotels are skipped and detail 404 is visible", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "booking.saved",
      JSON.stringify(["11111111-1111-1111-1111-111111111111"]),
    ),
  );
  await page.route(
    "**/api/v1/hotels/11111111-1111-1111-1111-111111111111",
    (route) =>
      route.fulfill({ status: 404, json: { error: "Hotel not found" } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "An Nhiên Retreat ↗" }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "không còn tồn tại",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await expect(
    page.getByRole("heading", { name: "Chưa có nơi nào được lưu" }),
  ).toBeVisible();
  await expect(page.locator(".stay-card")).toHaveCount(0);
});
