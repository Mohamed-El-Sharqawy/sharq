// apps/web — the admin-screen gate (SPEC §11: /users + /teams are
// admin-only). Two redirects: an anonymous/expired session (401
// AUTH_REQUIRED from the /me probe) → /login; a loaded non-admin role →
// the role home (/). While unresolved (pending or transport-failed) the
// screen renders anyway — the server's 403 envelope is the real guard.
import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { isSharqError } from "../../lib/sharq-error";
import { useAdminRole, useSession } from "./queries";

export function AdminGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const session = useSession();
  const role = useAdminRole();

  useEffect(() => {
    if (session.isError && isSharqError(session.error)) {
      if (session.error.code === "AUTH_REQUIRED") {
        navigate("/login", { replace: true });
      }
      return;
    }
    if (role === "denied") navigate("/", { replace: true });
  }, [navigate, role, session.error, session.isError]);

  if (role === "denied") return null;
  return <>{children}</>;
}
