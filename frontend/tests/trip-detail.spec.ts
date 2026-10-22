import { test, expect } from "@playwright/test";

const photo =
  "https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=960&q=80";
const initialBooking = {
  id: "aaaaaaaa-1111-4111-8111-111111111111",
  hotel_id: "11111111-1111-4111-8111-111111111111",
  room_type_id: "22222222-2222-4222-8222-222222222222",
  hotel_name: "Ánh Dương Resort Vũng Tàu 20 (Mẫu)",
  room_name: "Phòng gia đình hướng biển",
  room_image_url: photo,
  check_in: "2030-11-01",
  check_out: "2030-11-03",
  rooms: 2,
  guests: 4,
  guest_name: "Nguyễn Hoàng Phát",
  phone: "0901234567",
  status: "confirmed",
  payment_status: "unpaid",
  total: 2400000,
  currency: "VND",
  cancel_before: "2030-10-31T12:00:00Z",
};

test("booking detail shows the booked room photo, payment and cancellation states", async ({
  page,
}, testInfo) => {
  let booking = { ...initialBooking };
  await page.addInitScript(() =>
    localStorage.setItem(
      "booking.session",
      JSON.stringify({
        token: "trip-layout-test",
        expiresAt: Date.now() + 3600000,
      }),
    ),
  );
  await page.route("https://images.unsplash.com/**", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="600"><rect width="960" height="600" fill="#b9cbb7"/></svg>',
    }),
  );
  await page.route("**/api/v1/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/auth/me"))
      return route.fulfill({
        json: {
          id: "user-1",
          email: "guest@example.test",
          created_at: "2026-01-01T00:00:00Z",
        },
      });
    if (path.endsWith("/cancel")) {
      booking = { ...booking, status: "cancelled" };
      return route.fulfill({ json: booking });
    }
    return route.fulfill({ json: booking });
  });
  await page.goto(`/trips/${booking.id}`);
  await expect(
    page.getByRole("heading", { name: booking.hotel_name, exact: true }),
  ).toBeVisible();
  const image = page.getByRole("img", {
    name: `Phòng ${booking.room_name}`,
    exact: true,
  });
  await expect(image).toHaveAttribute("src", photo);
  await expect(page.locator(".trip-total strong")).toContainText("2.400.000");
  await expect(page.locator(".trip-occupancy")).toContainText(
    "2 phòng · 4 khách · 2 đêm",
  );
  await expect(page.locator(".trip-payment")).toHaveText("Chưa thanh toán");
  await page
    .getByRole("button", { name: "Xác nhận hủy đơn", exact: true })
    .click();
  await expect(page.locator(".trip-status")).toHaveText("Trạng thái: Đã hủy");
  await expect(image).toHaveAttribute("src", photo);
  await expect(
    page.getByRole("button", { name: "Xác nhận hủy đơn", exact: true }),
  ).toHaveCount(0);
  booking = {
    ...booking,
    status: "completed",
    payment_status: "paid",
    room_image_url: "",
  };
  await page.reload();
  await expect(page.locator(".trip-status")).toHaveText(
    "Trạng thái: Đã hoàn thành",
  );
  await expect(page.locator(".trip-payment")).toHaveText("Đã thanh toán");
  await expect(
    page.getByText("Chưa có ảnh phòng", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    path: testInfo.outputPath("completed-booking.png"),
    fullPage: true,
  });
});
