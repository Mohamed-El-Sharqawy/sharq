// SPEC §9.9 render specs — the three shared state components (roadmap row 10,
// red first; implementations land in row 11). Every screen reuses these —
// no bespoke empty/loading/error JSX (§9.9, §11).
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_DASHBOARD_TEAMS,
  ERROR_MESSAGE,
  ERROR_TITLE,
  LOADING_LABEL,
  RETRY_ACTION,
} from "@sharq/locales";
import { EmptyState, ErrorState, LoadingState } from "./states";

describe("SPEC §9.9 · EmptyState", () => {
  it("renders the screen-supplied Arabic message (SPEC §11 «مفيش فرق لسه»)", () => {
    render(<EmptyState message={EMPTY_DASHBOARD_TEAMS} />);
    expect(screen.getByText(EMPTY_DASHBOARD_TEAMS)).toBeVisible();
    expect(screen.getByText(EMPTY_DASHBOARD_TEAMS).closest("[data-slot]")).toHaveAttribute(
      "data-slot",
      "empty-state",
    );
  });
});

describe("SPEC §9.9 · LoadingState", () => {
  it("announces loading in Arabic to assistive tech and shows skeleton bars", () => {
    render(<LoadingState />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("data-slot", "loading-state");
    expect(screen.getByText(LOADING_LABEL)).toBeInTheDocument();
    expect(status.querySelectorAll("[data-slot='skeleton']").length).toBeGreaterThan(0);
  });
});

describe("SPEC §9.9 · ErrorState", () => {
  it("renders the Arabic error title + message and retries on demand", () => {
    const onRetry = vi.fn();
    render(<ErrorState onRetry={onRetry} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(ERROR_TITLE);
    expect(screen.getByText(ERROR_MESSAGE)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: RETRY_ACTION }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("lets a screen override the message with its own Arabic string", () => {
    render(<ErrorState onRetry={() => {}} message={EMPTY_DASHBOARD_TEAMS} />);
    expect(screen.getByText(EMPTY_DASHBOARD_TEAMS)).toBeVisible();
    expect(screen.queryByText(ERROR_MESSAGE)).not.toBeInTheDocument();
  });
});
