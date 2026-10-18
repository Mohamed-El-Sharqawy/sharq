// apps/web e2e — app shell against the dev server (TESTING §2.1/§9, SPEC §11).
// Successor of the TEMP hello-wiring scaffold: the same guarantees (Arabic
// RTL render + axe zero-critical) proven on the real RRv7 SPA at "/".
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("app shell", () => {
  test("renders the Arabic RTL shell at /", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar-EG");
    await expect(page).toHaveTitle(/شرق/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("شرق");
  });

  // SPEC §14.2: IBM Plex Sans Arabic self-hosted from @sharq/ui (§14.4 tokens
  // defined once there) — proven via the computed font on the real page.
  test("applies the self-hosted Arabic font from @sharq/ui", async ({
    page,
  }) => {
    await page.goto("/");
    await expect
      .poll(() =>
        page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily),
      )
      .toContain("IBM Plex Sans Arabic");
  });

  test("axe scan on / reports zero critical violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
