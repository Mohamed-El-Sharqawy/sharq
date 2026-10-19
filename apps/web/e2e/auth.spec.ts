// Row 13 — E2E flow F-01 (TESTING §9): admin login happy path → dashboard
// renders, and wrong credentials show the API's Arabic envelope message
// «البيانات مش صح» (FR-AUTH-01). Runs against the REAL stack: the api
// webServer + its ephemeral e2e Postgres (global-setup), seeded with the
// TESTING §15 personas (sayed / Sharq#2026). Axe + a visual baseline for
// /login ride along per the §9 "every run" additions.
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  DASHBOARD_TITLE,
  LOGIN_IDENTIFIER_LABEL,
  LOGIN_PASSWORD_LABEL,
  LOGIN_SUBMIT,
} from "@sharq/locales";

const login = (page: import("@playwright/test").Page, password: string) =>
  page
    .getByLabel(LOGIN_IDENTIFIER_LABEL)
    .fill("sayed")
    .then(() => page.getByLabel(LOGIN_PASSWORD_LABEL).fill(password))
    .then(() => page.getByRole("button", { name: LOGIN_SUBMIT }).click());

test.describe("F-01 · admin login (AUTH-01, DSH-01)", () => {
  test("given valid admin credentials, when submitted, then the dashboard renders", async ({
    page,
  }) => {
    await page.goto("/login");
    await login(page, "Sharq#2026");
    await expect(
      page.getByRole("button", { name: DASHBOARD_TITLE }),
    ).toBeVisible();
  });

  test("given a wrong password, when submitted, then the Arabic message «البيانات مش صح» shows and we stay on /login", async ({
    page,
  }) => {
    await page.goto("/login");
    await login(page, "Wrong#Password1");
    await expect(page.getByText("البيانات مش صح")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("axe scan on /login reports zero critical violations", async ({
    page,
  }) => {
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).analyze();
    const critical = results.violations.filter(
      (v) => v.impact === "critical",
    );
    expect(critical).toEqual([]);
  });

  test("visual baseline · /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: LOGIN_SUBMIT }).waitFor();
    await expect(page).toHaveScreenshot();
  });
});
