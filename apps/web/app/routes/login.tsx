// apps/web — /login route (SPEC §11): public, deliberately OUTSIDE the
// `_app` layout (that shell gets the session/role guards). On success the
// user lands on his role home — the dashboard placeholder for now
// (FR-AUTH-01; supervisor/employee homes arrive with their screens).
import { useNavigate } from "react-router";
import { useLogin } from "../features/auth/login.logic";
import { LoginView } from "../features/auth/login.view";

export default function LoginRoute() {
  const navigate = useNavigate();
  const { state, submit } = useLogin(
    () => void navigate("/", { viewTransition: true }),
  );
  return <LoginView state={state} onSubmit={submit} />;
}
