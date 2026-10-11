import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

const user = {
  id: "test-user",
  email: "guest@example.com",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
async function login(page: Page) {
  await page.getByRole("button", { name: "Đăng nhập ↗" }).click();
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
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
  await page.getByRole("button", { name: "Gần biển", exact: true }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Lưu The Coast House", exact: true })
    .click();
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await expect(page.locator(".stay-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: /Đã lưu/ }).click();
  await page.getByRole("button", { name: "The Coast House ↗" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Chưa hỗ trợ kiểm tra phòng trống",
  );
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
  await expect(page.getByRole("alert")).toContainText("ít nhất 8 ký tự");
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
  await expect(
    page.locator("dd").filter({ hasText: user.email }),
  ).toBeVisible();
  expect(authorization).toBe("Bearer test-token");
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([
    "booking.saved",
  ]);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Mỗi hành trình bắt đầu từ bạn" }),
  ).toBeVisible();
});
test("invalid login and network failure show recoverable errors", async ({
  page,
}) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({ status: 400, json: { error: "Invalid credentials" } }),
  );
  await page.goto("/");
  await login(page);
  await expect(page.getByRole("alert")).toContainText(
    "Email hoặc mật khẩu không đúng",
  );
  await page.route("**/api/v1/auth/login", (route) => route.abort());
  await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
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
});
test("desktop and mobile preview", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-home.png`,
    fullPage: true,
  });
});
