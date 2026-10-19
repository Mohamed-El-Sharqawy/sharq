// Row 13 — login view render specs (TESTING §6.5): props only, no query
// mocks; Arabic strings from @sharq/locales; ARIA roles for interactive
// elements. The three states: idle / submitting / inline error message.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  API_ERROR_MESSAGES,
  LOGIN_IDENTIFIER_LABEL,
  LOGIN_PASSWORD_LABEL,
  LOGIN_SUBMIT,
  LOGIN_SUBMITTING,
  LOGIN_TITLE,
} from "@sharq/locales";
import { LoginView } from "./login.view";

afterEach(cleanup);

describe("LoginView (§11 /login row)", () => {
  it("renders the Arabic title, both labels and the submit button", () => {
    render(<LoginView state={{ status: "idle" }} onSubmit={() => {}} />);
    expect(screen.getByRole("heading", { name: LOGIN_TITLE })).toBeTruthy();
    expect(screen.getByLabelText(LOGIN_IDENTIFIER_LABEL)).toBeTruthy();
    expect(screen.getByLabelText(LOGIN_PASSWORD_LABEL)).toBeTruthy();
    expect(screen.getByRole("button", { name: LOGIN_SUBMIT })).toBeTruthy();
  });

  it("submitting disables the button and shows the saving label", () => {
    render(<LoginView state={{ status: "submitting" }} onSubmit={() => {}} />);
    const button = screen.getByRole("button", { name: LOGIN_SUBMITTING });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("an error state announces the API's Arabic message via role=alert", () => {
    render(
      <LoginView
        state={{
          status: "error",
          message: API_ERROR_MESSAGES.AUTH_REQUIRED,
        }}
        onSubmit={() => {}}
      />,
    );
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toBe("البيانات مش صح");
  });

  it("submits the entered identifier and password through the prop", () => {
    const onSubmit = vi.fn().mockReturnValue(undefined);
    render(<LoginView state={{ status: "idle" }} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(LOGIN_IDENTIFIER_LABEL), {
      target: { value: "sayed" },
    });
    fireEvent.change(screen.getByLabelText(LOGIN_PASSWORD_LABEL), {
      target: { value: "pw" },
    });
    fireEvent.submit(document.querySelector("form")!);
    expect(onSubmit).toHaveBeenCalledWith("sayed", "pw");
  });
});
