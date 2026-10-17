import { test, expect } from "@playwright/test";
import { localDate } from "../src/catalog.ts";
test("live PostgreSQL: guest books and cancels a real room through the UI", async ({
  page,
  request,
}) => {
  test.skip(
    process.env.RUN_LIVE !== "1",
    "Set RUN_LIVE=1 with local backend/PostgreSQL",
  );
  const api = "http://127.0.0.1:8080/api/v1";
  const suffix = crypto.randomUUID().slice(0, 8);
  const password = "live-test-password";
  async function account(label: string) {
    const email = label + "-" + suffix + "@example.test";
    const register = await request.post(api + "/auth/register", {
      data: { email, password },
    });
    expect(register.status()).toBe(200);
    const response = await request.post(api + "/auth/login", {
      data: { email, password },
    });
    expect(response.status()).toBe(200);
    const data = await response.json();
    return { email, token: data.access_token as string };
  }
  const owner = await account("owner"),
    guest = await account("guest");
  const headers = { Authorization: "Bearer " + owner.token };
  const hotelResponse = await request.post(api + "/hotels", {
    headers,
    data: {
      name: "Live Hotel " + suffix,
      slug: "live-" + suffix,
      city: "Hue",
      country: "VN",
      address: "Live test",
      rank: 4,
    },
  });
  expect(hotelResponse.status()).toBe(201);
  const hotel = await hotelResponse.json();
  const roomResponse = await request.post(
    api + "/hotels/" + hotel.id + "/room-types",
    {
      headers,
      data: { name: "Double live", capacity: 2, total_rooms: 1, active: true },
    },
  );
  expect(roomResponse.status()).toBe(201);
  const room = await roomResponse.json();
  const from = localDate(1),
    to = localDate(3);
  const inventory = await request.put(
    api + "/room-types/" + room.id + "/inventory",
    { headers, data: { from, to, capacity: 1, price: 500000 } },
  );
  expect(inventory.status()).toBe(200);
  const denied = await request.put(api + "/hotels/" + hotel.id, {
    headers: { Authorization: "Bearer " + guest.token },
    data: {
      name: "Stolen",
      slug: "stolen-" + suffix,
      city: "Hue",
      country: "VN",
      rank: 0,
    },
  });
  expect(denied.status()).toBe(403);
  await page.goto("/");
  await page.getByRole("button", { name: "Đăng nhập ↗" }).click();
  await page.getByLabel("Email", { exact: true }).fill(guest.email);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập →", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Đăng xuất", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Điểm đến", { exact: true })
    .fill("Live Hotel " + suffix);
  await page.getByRole("button", { name: "Tìm nơi ở" }).click();
  await page
    .getByRole("button", { name: "Live Hotel " + suffix + " ↗" })
    .click();
  await page
    .getByRole("button", { name: "Kiểm tra phòng trống", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Chọn Double live", exact: true })
    .click();
  await page.getByLabel("Tên khách", { exact: true }).fill("Khach live");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0900000000");
  await page
    .getByRole("button", { name: "Xác nhận đặt phòng", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Đặt phòng thành công" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Xem chuyến đi của tôi" }).click();
  await page
    .getByRole("button", { name: /Chi tiết đơn/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Xác nhận hủy đơn", exact: true })
    .click();
  await expect(page.getByText("Trạng thái: Đã hủy")).toBeVisible();
  const rows = await request.get(
    api +
      "/hotels/" +
      hotel.id +
      "/availability?" +
      new URLSearchParams({
        check_in: from,
        check_out: to,
        rooms: "1",
        guests: "2",
      }),
  );
  expect((await rows.json())[0].available).toBe(1);
  await page.screenshot({
    path: "test-results/live-" + test.info().project.name + ".png",
    fullPage: true,
  });
});

