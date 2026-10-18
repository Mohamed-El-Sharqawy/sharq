// apps/web e2e — SPEC §14.3 view transitions against the real SPA:
// direction-aware slides, opacity-fade fallback when the View Transitions
// API is absent, and the prefers-reduced-motion kill switch (TESTING §9).
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

type VtHit = { sel: string; media: string | null; animation: string };
type VtCss = {
  slide: boolean;
  reducedMotionKills: boolean;
  fallbackFade: boolean;
};

// CSSOM dump: rule selectors (+ their media context) from every stylesheet.
async function dumpVtHits(page: Page): Promise<VtHit[]> {
  return page.evaluate(() => {
    const hits: { sel: string; media: string | null; animation: string }[] = [];
    const push = (sel: string, media: string | null, animation: string) => {
      hits.push({ sel, media, animation });
    };
    const readMedia = (mediaRule: CSSMediaRule) => {
      for (const inner of Array.from(mediaRule.cssRules)) {
        if (inner instanceof CSSStyleRule) {
          push(
            inner.selectorText,
            mediaRule.conditionText,
            inner.style.animation,
          );
        }
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSMediaRule) readMedia(rule);
        else if (rule instanceof CSSStyleRule)
          push(rule.selectorText, null, rule.style.animation);
      }
    }
    return hits;
  });
}

// CSSOM scan: the SPEC §14.3 motion contract lives in the stylesheet.
function scanVtCss(hits: VtHit[]): VtCss {
  const reduced = hits.filter((h) =>
    h.media?.includes("prefers-reduced-motion"),
  );
  return {
    slide: hits.some((h) =>
      h.sel.includes("::view-transition-old(sharq-page)"),
    ),
    fallbackFade: hits.some((h) =>
      h.sel.includes(".vt-fallback .vt-page-root"),
    ),
    reducedMotionKills: reduced.some(
      (h) =>
        h.sel.includes("::view-transition") && h.animation.includes("none"),
    ),
  };
}

test.describe("SPEC §14.3 · view transitions · page root & travel direction", () => {
  test("page root carries the view-transition name and the motion CSS ships", async ({
    page,
  }) => {
    await page.goto("/demo");
    // SPA mode: the page root exists only after client hydration.
    await page.locator(".vt-page-root").first().waitFor();
    const name = await page.evaluate(() => {
      const el = document.querySelector(".vt-page-root");
      return el
        ? getComputedStyle(el).getPropertyValue("view-transition-name")
        : "";
    });
    expect(name.trim()).toBe("sharq-page");
    const css = scanVtCss(await dumpVtHits(page));
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
    // 10s: cold dev-server boot + full-parallel workers can exceed the 5s
    // expect default (one flake observed under exactly that load, 2026-10-18).
    await expect(page.locator("html")).toHaveAttribute(
      "data-vt-dir",
      "forward",
      { timeout: 10_000 },
    );
    // <Link viewTransition> really went through document.startViewTransition.
    await expect
      .poll(() =>
        page.evaluate(() => (window as { __vtCalls?: number }).__vtCalls ?? 0),
      )
      .toBeGreaterThan(0);
    await page.goBack();
    await expect(page.locator("html")).toHaveAttribute("data-vt-dir", "back", {
      timeout: 10_000,
    });
  });
});

test.describe("SPEC §14.3 · view transitions · fallback & reduced motion", () => {
  test("fallback: opacity fade when startViewTransition is absent", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      delete (Document.prototype as { startViewTransition?: unknown })
        .startViewTransition;
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
      delete (Document.prototype as { startViewTransition?: unknown })
        .startViewTransition;
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/demo");
    // SPA mode: wait for hydration before reading computed styles.
    await page.locator(".vt-page-root").first().waitFor();
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
    expect(results.violations.filter((v) => v.impact === "critical")).toEqual(
      [],
    );
  });
});
