// Unit render specs for the skeleton route components (TESTING §4.3: view
// tests ship alongside). The root Layout document contract (lang/dir/title)
// is proven in e2e app.spec.ts — Layout renders framework <Meta/> which needs
// the real router runtime.
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { APP_NAME, HOME_LINK, NOT_FOUND_TITLE } from "@sharq/locales";
import Dashboard from "./routes/_app._index/route";
import NotFound from "./routes/$/route";

describe("SPEC §11 · routing skeleton", () => {
  it("dashboard placeholder renders the app name heading", () => {
    render(<Dashboard />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      APP_NAME,
    );
  });

  it("catch-all renders the Arabic 404 page with a way back", () => {
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      NOT_FOUND_TITLE,
    );
    expect(screen.getByRole("link", { name: HOME_LINK })).toHaveAttribute(
      "href",
      "/",
    );
  });
});
