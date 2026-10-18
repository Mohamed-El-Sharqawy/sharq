// CHORE wiring spec — proves Vitest + jsdom + Testing Library + jest-dom all
// execute with automatic JSX (TESTING §2.1). TEMP: deleted when real screens
// land (tracked in PROGRESS).
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Hello } from "./hello";

describe("CHORE · vitest + jsdom + RTL wiring", () => {
  it("renders a component and asserts with jest-dom", () => {
    render(<Hello />);
    expect(screen.getByText("شرق")).toBeInTheDocument();
  });
});
