// SPEC §11: pathless `_app` layout — session + role guard + view transitions
// land with Phase 1/2 and roadmap row 11; for now it proves the nesting.
import { Outlet } from "react-router";

export default function AppLayout() {
  return <Outlet />;
}
