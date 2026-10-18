// apps/web e2e — routing skeleton per SPEC §11: `_app` layout mounted at /,
// Arabic 404 catch-all, root ErrorBoundary for thrown errors.
import { expect, test } from "@playwright/test";

test.describe("SPEC §11 · routing skeleton", () => {
  test("unknown path renders the Arabic 404 page with a way back", async ({
    page,
  }) => {
    await page.goto("/no/such/route");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "الصفحة دي مش موجودة",
    );
    await expect(page.getByRole("link", { name: "الرئيسية" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  test("a throwing route renders the error boundary, not a blank page", async ({
    page,
  }) => {
    await page.goto("/boom");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "حصل مشكلة",
    );
    await expect(page.getByRole("link", { name: "الرئيسية" })).toBeVisible();
  });
});
