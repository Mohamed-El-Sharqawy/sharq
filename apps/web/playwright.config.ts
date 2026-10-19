// apps/web — Playwright E2E per TESTING §2.1/§9: chromium-only, two projects
// (desktop-RTL 1280x720 + mobile), trace viewer, axe addon. Specs drive the
// real RRv7 dev server via page.goto (roadmap row 8); row 13 boots the FULL
// stack against the shared Neon Postgres (api + web; global-setup migrates
// and seeds — idempotent).
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

// TESTING §9 visual-baseline policy, set once here for every spec:
// full-page capture, animations frozen (deterministic skeletons), and a
// 500-pixel absolute budget — big enough for cross-runner raster noise,
// far too small to survive an RTL/font/layout regression. Goldens are
// committed next to each spec, auto-suffixed with project + platform.
const screenshotPolicy = {
  fullPage: true,
  animations: "disabled" as const,
  maxDiffPixels: 500,
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  expect: { toHaveScreenshot: screenshotPolicy },
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
  // Row 13: Neon-backed e2e — global-setup migrates + seeds before the
  // servers; the api resolves DATABASE_URL itself (apps/api/.env locally,
  // the NEON_DATABASE_URL secret's env var in CI — no secrets committed).
  globalSetup: "./e2e/global-setup.ts",
  webServer: [
    {
      command: "pnpm --filter @sharq/api exec bun src/index.ts",
      url: "http://127.0.0.1:3000/api/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      // webServer.env REPLACES the child environment (no PATH etc.) —
      // spread process.env; in CI that carryon includes the secret-derived
      // DATABASE_URL (env vars beat .env files under bun).
      env: {
        ...process.env,
        PORT: "3000",
      },
    },
    {
      command: "pnpm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
