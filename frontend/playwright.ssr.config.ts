import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "ssr.spec.ts",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:18082",
    javaScriptEnabled: false,
  },
  webServer: [
    {
      command: "node tests/fixtures/ssr-api.mjs",
      url: "http://127.0.0.1:18081/healthz",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --port 18082",
      url: "http://127.0.0.1:18082",
      env: {
        BACKEND_ORIGIN: "http://127.0.0.1:18081",
        NEXT_PUBLIC_API_BASE_URL: "/api/v1",
      },
      reuseExistingServer: false,
    },
  ],
});
