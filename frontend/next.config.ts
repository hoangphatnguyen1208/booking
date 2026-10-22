import type { NextConfig } from "next";

const backend = (process.env.BACKEND_ORIGIN || "http://127.0.0.1:8080").replace(/\/$/, "");
const config: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api/v1/:path*", destination: `${backend}/api/v1/:path*` },
      { source: "/healthz", destination: `${backend}/healthz` },
      { source: "/readyz", destination: `${backend}/readyz` },
      { source: "/swagger/:path*", destination: `${backend}/swagger/:path*` },
    ];
  },
};
export default config;
