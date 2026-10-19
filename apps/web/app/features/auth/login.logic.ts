// apps/web — /login orchestration (SPEC §9.4 logic.ts hook): owns the three
// §11 screen states (— / spinner / inline message); the route decides where
// a success navigates (FR-AUTH-01 role homes).
import { useCallback, useState } from "react";
import { loginRequest } from "./api";
import type { LoginState } from "./login.view";

export function useLogin(onSuccess: () => void) {
  const [state, setState] = useState<LoginState>({ status: "idle" });

  const submit = useCallback(
    async (identifier: string, password: string) => {
      setState({ status: "submitting" });
      const result = await loginRequest(identifier, password);
      if (result.ok) {
        onSuccess();
        return;
      }
      setState({ status: "error", message: result.message });
    },
    [onSuccess],
  );

  return { state, submit };
}
