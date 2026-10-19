// apps/web — /login screen view (SPEC §11): props-only presentational
// component; the three screen states (— / spinner / inline message).
// Arabic strings from @sharq/locales only (SPEC §9). Single column, large
// inputs per the §11 login row. `.vt-page-root`: the login page IS a page
// root for §14.3 transitions (it lives outside the `_app` layout).
import {
  LOGIN_IDENTIFIER_LABEL,
  LOGIN_PASSWORD_LABEL,
  LOGIN_SUBMIT,
  LOGIN_SUBMITTING,
  LOGIN_TITLE,
} from "@sharq/locales";
import { Button } from "@sharq/ui/components/button";
import { type FormEvent, useId, useState } from "react";

export type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

export type LoginViewProps = {
  state: LoginState;
  onSubmit: (identifier: string, password: string) => void;
};

export function LoginView({ state, onSubmit }: LoginViewProps) {
  const identifierId = useId();
  const passwordId = useId();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const submitting = state.status === "submitting";

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!submitting) onSubmit(identifier, password);
  };

  return (
    <div className="vt-page-root grid min-h-dvh place-items-center bg-background p-4 text-foreground">
      <form
        className="w-full max-w-sm space-y-4"
        onSubmit={handleSubmit}
        noValidate
      >
        <h1 className="text-center text-2xl font-semibold">{LOGIN_TITLE}</h1>
        <label className="block space-y-2" htmlFor={identifierId}>
          <span>{LOGIN_IDENTIFIER_LABEL}</span>
          <input
            id={identifierId}
            className="h-12 w-full rounded-md border border-input bg-transparent px-3 text-lg"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            autoComplete="username"
          />
        </label>
        <label className="block space-y-2" htmlFor={passwordId}>
          <span>{LOGIN_PASSWORD_LABEL}</span>
          <input
            id={passwordId}
            type="password"
            className="h-12 w-full rounded-md border border-input bg-transparent px-3 text-lg"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {state.status === "error" && (
          <p role="alert" className="text-destructive">
            {state.message}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full text-lg"
          disabled={submitting}
        >
          {submitting ? LOGIN_SUBMITTING : LOGIN_SUBMIT}
        </Button>
      </form>
    </div>
  );
}
