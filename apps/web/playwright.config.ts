// apps/web — Playwright E2E per TESTING §2.1/§9: chromium-only, two projects
// (desktop-RTL 1280x720 + mobile), trace viewer, axe addon.
// The webServer lands with the Vite+RRv7 task; specs then use page.goto("/").
import {
  defineConfig,
  devices,
  type ReporterDescription,
} from "@playwright/test";

// TESTING §13: deterministic runs — Arabic locale, Cairo timezone pinned.
const rtlContext = { locale: "ar-EG", timezoneId: "Africa/Cairo" };

const reporter: ReporterDescription[] = [
  ["list"],
  ["html", { open: "never" }], // view with: pnpm exec playwright show-report
];

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // TESTING §3: E2E budget assumes >= 2 parallel workers; CI pins exactly 2.
  workers: process.env.CI ? 2 : undefined,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [...reporter, ["github"]] : reporter,
  use: {
    baseURL: "http://localhost:5173",
    // TESTING §2.2 (5): trace viewer makes CI failures debuggable:
    // pnpm exec playwright show-trace test-results/<test>/trace.zip
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop-RTL",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 720 },
        ...rtlContext,
      },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], ...rtlContext },
    },
  ],
});
