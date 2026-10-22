import { test, expect } from "@playwright/test";

const hotel = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Ánh Dương Resort Vũng Tàu 20 (Mẫu)",
  slug: "booking-demo-020",
  city: "Vũng Tàu",
  country: "VN",
  address: "Đường ven biển",
  rank: 4,
  image_url:
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=960&q=80",
};
const room = {
  id: "room-1",
  hotel_id: hotel.id,
  name: "Phòng gia đình hướng biển",
  capacity: 4,
  total_rooms: 12,
  active: true,
  image_url:
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=960&q=80",
};
const user = {
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  id: "user-1",
  email: "hoangphatnguyen1208@example.com",
  roles: [{ id: "admin", name: "admin" }],
};
const booking = {
  id: "aaaaaaaa-1111-1111-1111-111111111111",
  hotel_id: hotel.id,
  hotel_name: hotel.name,
  room_name: room.name,
  check_in: "2026-11-01",
  check_out: "2026-11-03",
  rooms: 2,
  guests: 4,
  guest_name: "Nguyễn Hoàng Phát",
  phone: "0901234567",
  status: "confirmed",
  total: 2400000,
  currency: "VND",
  cancel_before: "2026-10-31T12:00:00Z",
};

test("all routes and management workspace fit narrow and wide screens", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "booking.session",
      JSON.stringify({ token: "layout-test", expiresAt: Date.now() + 3600000 }),
    );
    localStorage.setItem(
      "booking.saved",
      JSON.stringify(["11111111-1111-1111-1111-111111111111"]),
    );
  });
  // Keep routine checks independent of external image availability.
  if (!process.env.LAYOUT_REAL_IMAGES)
    await page.route("https://images.unsplash.com/**", (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" fill="#b9cbb7"/></svg>',
      }),
    );
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname.replace("/api/v1", "");
    let json: unknown = [];
    if (path === "/auth/me") json = user;
    else if (path === "/hotels" || path === "/me/hotels")
      json = {
        items: [
          hotel,
          {
            ...hotel,
            id: "hotel-2",
            name: "Mây Boutique TP. Hồ Chí Minh 17 (Mẫu)",
          },
        ],
        page: 1,
        limit: 20,
      };
    else if (path === `/hotels/${hotel.id}`) json = hotel;
    else if (path.endsWith("/availability"))
      json = [
        { room, available: 5, total: 1200000, currency: "VND", nights: [] },
      ];
    else if (path.endsWith("/manage-rooms")) json = [room];
    else if (path.endsWith("/members"))
      json = [{ user_id: user.id, email: user.email, role: "owner" }];
    else if (path.endsWith("/inventory"))
      json = [{ date: "2026-11-01", capacity: 12, reserved: 2, price: 600000 }];
    else if (path === "/bookings" || path.endsWith("/bookings"))
      json = [booking];
    else if (path === `/bookings/${booking.id}`) json = booking;
    else if (path === "/admin/users") json = [user];
    else if (path === "/admin/audit-logs")
      json = [
        {
          id: "log-1",
          user_id: user.id,
          method: "POST",
          path: "/hotels",
          status: 201,
          created_at: "2026-10-23T09:00:00Z",
        },
      ];
    return route.fulfill({ json });
  });
  const widths =
    testInfo.project.name === "mobile" ? [390, 320] : [1440, 1024, 768];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of [
      "/",
      "/saved",
      "/trips",
      "/profile",
      "/manage",
      "/admin",
      "/login",
      "/register",
    ]) {
      await page.goto(route);
      await expect(page.locator(".app-shell")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Đăng xuất", exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("navigation", { name: "Khám phá ở footer" }),
      ).toBeVisible();
      if (route === "/" || route === "/saved")
        await expect(page.locator(".stay-card").first()).toBeVisible();
      if (route === "/" || route === "/saved")
        await expect
          .poll(() =>
            page
              .locator(".stay-card img")
              .first()
              .evaluate((el) => (el as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
      if (route === "/" || route === "/saved") {
        const save = page.locator(".save-button").first();
        await save.scrollIntoViewIfNeeded();
        await expect
          .poll(() =>
            save.evaluate((button) => {
              const rect = button.getBoundingClientRect();
              return button.contains(
                document.elementFromPoint(
                  rect.x + rect.width / 2,
                  rect.y + rect.height / 2,
                ),
              );
            }),
          )
          .toBe(true);
        await page.evaluate(() => window.scrollTo(0, 0));
      }
      if (route === "/trips")
        await expect(page.locator(".management-list article")).toHaveCount(1);
      if (route === "/admin") {
        await expect(page.locator(".management-list article")).toHaveCount(1);
        await page
          .getByRole("button", { name: "Tải nhật ký", exact: true })
          .click();
        await expect(
          page.getByRole("cell", { name: "POST /hotels", exact: true }),
        ).toBeVisible();
      }
      if (route === "/manage")
        await expect(page.locator(".management-list article")).toHaveCount(2);
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await page.screenshot({
        path: testInfo.outputPath(`${width}-${route.slice(1) || "home"}.png`),
        fullPage: true,
      });
      if (route === "/") {
        await page
          .getByRole("link", { name: `${hotel.name} ↗`, exact: true })
          .click();
        await expect(page.locator(".hotel-detail-page")).toContainText(
          "Kiểm tra phòng trống",
        );
        await expect
          .poll(() =>
            page.locator(".hotel-detail-page").evaluate((detailPage) => {
              const booking = detailPage
                .querySelector(".booking-panel")!
                .getBoundingClientRect();
              const save = detailPage
                .querySelector(".detail-save-actions button")!
                .getBoundingClientRect();
              return save.top - booking.bottom;
            }),
          )
          .toBeGreaterThanOrEqual(40);
        await page
          .getByRole("button", { name: "Kiểm tra phòng trống", exact: true })
          .click();
        const photo = page.getByRole("img", {
          name: `Phòng ${room.name}`,
          exact: true,
        });
        await expect(photo).toBeVisible();
        await expect
          .poll(() =>
            photo.evaluate((el) => (el as HTMLImageElement).naturalWidth),
          )
          .toBeGreaterThan(0);
        await expect
          .poll(() =>
            page
              .locator(".hotel-detail-page")
              .evaluate((el) => el.scrollWidth - el.clientWidth),
          )
          .toBeLessThanOrEqual(1);
        await page.screenshot({
          path: testInfo.outputPath(`${width}-hotel-detail.png`),
          fullPage: true,
        });
        await photo.scrollIntoViewIfNeeded();
        await page.screenshot({
          path: testInfo.outputPath(`${width}-room-options.png`),
        });
        await page.goBack();
      }
      if (route === "/trips") {
        await page
          .getByRole("link", {
            name: `Chi tiết đơn ${booking.id.slice(0, 8)}`,
          })
          .click();
        await expect(
          page.getByRole("heading", { name: "Chi tiết đơn", exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: testInfo.outputPath(`${width}-booking-detail.png`),
          fullPage: true,
        });
      }
      if (route === "/manage") {
        await page
          .getByRole("link", { name: `Phòng và nhân sự ${hotel.name}` })
          .click();
        await page
          .getByRole("button", { name: room.name, exact: true })
          .click();
        await page
          .getByRole("button", { name: "Xem tồn theo ngày", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Xem thành viên", exact: true })
          .click();
        await expect(
          page.getByText(`${user.email} · owner`, { exact: true }),
        ).toBeVisible();
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth - innerWidth,
            ),
          )
          .toBeLessThanOrEqual(1);
        await page.screenshot({
          path: testInfo.outputPath(`${width}-workspace.png`),
          fullPage: true,
        });
        await page.getByRole("link", { name: "Đóng quản lý phòng" }).click();
        await page
          .getByRole("button", { name: `Sửa ${hotel.name}`, exact: true })
          .click();
        await expect(
          page.getByLabel("Tên khách sạn", { exact: true }),
        ).toHaveValue(hotel.name);
        await page.screenshot({
          path: testInfo.outputPath(`${width}-hotel-form.png`),
          fullPage: true,
        });
      }
    }
  }
});
