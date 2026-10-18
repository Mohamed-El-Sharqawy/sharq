// apps/web e2e — SPEC §14.3 view transitions against the real SPA:
// direction-aware slides, opacity-fade fallback when the View Transitions
// API is absent, and the prefers-reduced-motion kill switch (TESTING §9).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type VtCss = {
  slide: boolean;
  reducedMotionKills: boolean;
  fallbackFade: boolean;
};

// CSSOM scan: the motion contract lives in the compiled stylesheet.
async function scanVtCss(page: Page): Promise<VtCss> {
  return page.evaluate(() => {
    const out = { slide: false, reducedMotionKills: false, fallbackFade: false };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          if (rule.selectorText.includes("::view-transition-old(sharq-page)")) {
            out.slide = true;
          }
          if (rule.selectorText.includes(".vt-fallback .vt-page-root")) {
            out.fallbackFade = true;
          }
        }
        if (
          rule instanceof CSSMediaRule &&
          rule.conditionText.includes("prefers-reduced-motion")
        ) {
          for (const inner of Array.from(rule.cssRules)) {
            if (
              inner instanceof CSSStyleRule &&
              inner.selectorText.includes("::view-transition") &&
              inner.style.animation.includes("none")
            ) {
              out.reducedMotionKills = true;
            }
          }
        }
      }
    }
    return out;
  });
}

test.describe("SPEC §14.3 · view transitions", () => {
  test("page root carries the view-transition name and the motion CSS ships", async ({
    page,
  }) => {
    await page.goto("/demo");
    const name = await page.evaluate(() => {
      const el = document.querySelector(".vt-page-root");
      return el
        ? getComputedStyle(el).getPropertyValue("view-transition-name")
        : "";
    });
    expect(name.trim()).toBe("sharq-page");
    const css = await scanVtCss(page);
    expect(css.slide).toBe(true);
    expect(css.reducedMotionKills).toBe(true);
    expect(css.fallbackFade).toBe(true);
  });

  test("link navigation animates by travel direction", async ({ page }) => {
    await page.addInitScript(() => {
      const original = Document.prototype.startViewTransition;
      Object.defineProperty(window, "__vtCalls", { value: 0, writable: true });
      Document.prototype.startViewTransition = function (update) {
        (window as { __vtCalls?: number }).__vtCalls =
          ((window as { __vtCalls?: number }).__vtCalls ?? 0) + 1;
        return original.call(this, update);
      };
    });
    await page.goto("/");
    await page.getByRole("link", { name: "صفحة المعاينة" }).click();
    await expect(page.locator("html")).toHaveAttribute(
      "data-vt-dir",
      "forward",
    );
    // <Link viewTransition> really went through document.startViewTransition.
    await expect
      .poll(() => page.evaluate(() => (window as { __vtCalls?: number }).__vtCalls ?? 0))
      .toBeGreaterThan(0);
    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("data-vt-dir", "back");
  });

  test("fallback: opacity fade when startViewTransition is absent", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      delete Document.prototype.startViewTransition;
    });
    await page.goto("/demo");
    await expect(page.locator("html")).toHaveClass(/vt-fallback/);
    const animation = await page.evaluate(() => {
      const el = document.querySelector(".vt-page-root");
      return el ? getComputedStyle(el).animationName : "";
    });
    expect(animation).toBe("sharq-vt-fade");
  });

  test("reduced motion disables all motion including the fallback fade", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      delete Document.prototype.startViewTransition;
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo");
    const animation = await page.evaluate(() => {
      const el = document.querySelector(".vt-page-root");
      return el ? getComputedStyle(el).animationName : "";
    });
    expect(animation).toBe("none");
  });

  test("axe scan on /demo reports zero critical violations", async ({
    page,
  }) => {
    await page.goto("/demo");
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((v) => v.impact === "critical"),
    ).toEqual([]);
  });
});
