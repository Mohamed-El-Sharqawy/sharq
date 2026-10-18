// Unit specs for the SPEC §14.3 view-transition machinery (TESTING §2.1:
// logic hooks + component render). Direction math is a pure function; the
// boot class + director are proven in jsdom, where the View Transitions API
// is absent — which is exactly the fallback path of the SPEC.
import { render, waitFor } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import {
  ViewTransitionDirector,
  applyViewTransitionFallbackClass,
  nextDirection,
} from "./view-transition";

afterEach(() => {
  delete document.documentElement.dataset.vtDir;
  document.documentElement.classList.remove("vt-fallback");
});

describe("SPEC §14.3 · view transitions", () => {
  describe("nextDirection — travel direction from history idx", () => {
    it("defaults to forward when no previous idx exists", () => {
      expect(nextDirection(undefined, 0)).toBe("forward");
    });

    it("a deeper idx is forward travel", () => {
      expect(nextDirection(3, 4)).toBe("forward");
    });

    it("a shallower idx is back travel", () => {
      expect(nextDirection(4, 3)).toBe("back");
    });

    it("an equal idx (replace navigation) stays forward", () => {
      expect(nextDirection(3, 3)).toBe("forward");
    });
  });

  describe("applyViewTransitionFallbackClass — SPEC §14.3 fallback", () => {
    it("marks the document when startViewTransition is absent", () => {
      // jsdom ships no View Transitions API — the fallback precondition.
      expect(typeof document.startViewTransition).toBe("undefined");
      applyViewTransitionFallbackClass(document);
      expect(document.documentElement.classList.contains("vt-fallback")).toBe(
        true,
      );
    });

    it("leaves the document unmarked when the API exists", () => {
      // Shadow the prototype method with an own-property stub.
      Object.defineProperty(document, "startViewTransition", {
        value: () => ({ finished: Promise.resolve({}) }),
        configurable: true,
        writable: true,
      });
      try {
        applyViewTransitionFallbackClass(document);
        expect(document.documentElement.classList.contains("vt-fallback")).toBe(
          false,
        );
      } finally {
        delete (document as { startViewTransition?: unknown })
          .startViewTransition;
      }
    });
  });

  it("ViewTransitionDirector sets html[data-vt-dir] + the fallback class", async () => {
    const router = createMemoryRouter(
      [{ path: "/", element: <ViewTransitionDirector /> }],
      { initialEntries: ["/"] },
    );
    render(<RouterProvider router={router} />);
    await waitFor(() => {
      expect(document.documentElement.dataset.vtDir).toBe("forward");
    });
    // jsdom has no startViewTransition → the fallback class must appear.
    expect(document.documentElement.classList.contains("vt-fallback")).toBe(
      true,
    );
  });
});
