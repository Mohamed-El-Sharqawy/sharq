// apps/web e2e — visual baselines (TESTING §9: desktop RTL + mobile per key
// screen). Goldens live in visual.spec.ts-snapshots/ next to this file and
// are committed; Playwright auto-suffixes each golden with project + platform
// (`demo-page-desktop-RTL-win32.png` vs `...-linux.png`), so Windows dev and
// Linux CI compare against their own rendering. Tolerance + capture options
// are set once in playwright.config.ts (expect.toHaveScreenshot), never here.
import { expect, test } from "@playwright/test";

test.describe("visual baselines", () => {
  // `/demo` is row 13's baseline screen: the three §9.9 shared states plus
  // view-transition links, one full-page shot per project.
  test("demo page", async ({ page }) => {
    await page.goto("/demo");
    // Hydrated SPA first (row-8 lesson: goto resolves before render), then
    // the self-hosted Arabic subsets (§14.2) — glyphs must be real before
    // the shot, or the golden bakes in the fallback font.
    await page.locator(".vt-page-root").waitFor();
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot();
  });
});
