// Render spec for the RTL demo route: the SPEC §9.9 states on one page, and
// the navigation vehicle for §14.3 view transitions (roadmap rows 12-13 —
// the visual baseline of this page lands with row 13 / TESTING §9).
import { render, screen } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { DEMO_TITLE, HOME_LINK } from "@sharq/locales";
import Demo from "./routes/_app.demo/route";

function renderDemo() {
  const router = createMemoryRouter([{ path: "/demo", element: <Demo /> }], {
    initialEntries: ["/demo"],
  });
  return render(<RouterProvider router={router} />);
}

describe("SPEC §14.3/§9.9 · RTL demo route", () => {
  it("renders the three shared state components on one page", () => {
    renderDemo();
    expect(document.querySelector('[data-slot="empty-state"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="loading-state"]')).not.toBeNull();
    expect(document.querySelector('[data-slot="error-state"]')).not.toBeNull();
  });

  it("links home with the view-transition state wiring exposed", () => {
    renderDemo();
    const home = screen.getByRole("link", { name: HOME_LINK });
    expect(home).toHaveAttribute("href", "/");
    // useViewTransitionState drives this attribute (SPEC §14.3) — present
    // with "false" while no transition is running in the memory router.
    expect(home).toHaveAttribute("data-vt-active", "false");
  });

  it("announces the demo heading", () => {
    renderDemo();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      DEMO_TITLE,
    );
  });
});
