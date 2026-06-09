const { defineConfig, devices } = require("@playwright/test");

// E2E contra o build local do Eleventy (sem Functions/Identity).
// Cobre os fluxos públicos/determinísticos: capa da home, /entrar/ deslogado, nav mobile.
module.exports = defineConfig({
  testDir: "./test/e2e",
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx @11ty/eleventy --serve --port 8080",
    url: "http://localhost:8080/",
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
