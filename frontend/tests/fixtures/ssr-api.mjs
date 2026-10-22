import http from "node:http";
const hotel = {
  id: "99999999-9999-4999-8999-999999999999",
  name: "SSR Hotel Huế",
  slug: "ssr-hotel",
  city: "Huế",
  country: "VN",
  address: "Số 1 đường Lê Lợi",
  rank: 4,
  amenities: ["Wi-Fi miễn phí"],
  image_url: "",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};
const server = http.createServer((request, response) => {
  const url = new URL(request.url, "http://localhost");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  if (url.pathname === "/healthz") return response.end("{}");
  if (url.pathname === "/api/v1/hotels")
    return response.end(
      JSON.stringify({
        items: url.searchParams.get("destination") === "empty" ? [] : [hotel],
        page: 1,
        limit: 20,
      }),
    );
  if (url.pathname === `/api/v1/hotels/${hotel.id}`)
    return response.end(JSON.stringify(hotel));
  response.statusCode = 404;
  response.end(JSON.stringify({ error: "Hotel not found" }));
});
server.listen(18081, "127.0.0.1");
