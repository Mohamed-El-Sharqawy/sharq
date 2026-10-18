// TEMP hello-wiring (see PROGRESS Decisions): scaffold proof only — proves
// chromium launches in both projects and axe integrates. Replaced by
// page.goto("/") against the webServer when the Vite task lands.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const page = (body: string) =>
  `<!doctype html><html dir="rtl" lang="ar"><head><title>شرق</title></head><body>${body}</body></html>`;

test.describe("hello e2e scaffold", () => {
  test("renders an Arabic RTL page in every project", async ({
    page: browser,
  }) => {
    await browser.setContent(page('<h1 id="mark">شرق</h1>'));
    await expect(browser.locator("html")).toHaveAttribute("dir", "rtl");
    // TEMP CI failure-path proof (reverted immediately): deliberately wrong text.
    await expect(browser.locator("#mark")).toHaveText("فشل مقصود");
  });

  test("axe scan reports zero critical violations", async ({
    page: browser,
  }) => {
    await browser.setContent(page("<h1>شرق</h1><button>حفظ</button>"));
    const results = await new AxeBuilder({ page: browser }).analyze();
    const critical = results.violations.filter((v) => v.impact === "critical");
    expect(critical).toEqual([]);
  });
});
