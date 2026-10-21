// SPEC §11: pathless `_app` layout — hosts the one QueryClient provider
// for every signed-in screen (§9.6) and the §14.3 page root (the only
// element carrying a view-transition-name). Session/role guards live on
// the screens that need them (auth/admin-gate) — anonymous-reachable
// pages under this layout (the dashboard + demo scaffolding) must not
// probe the session.
import { Outlet } from "react-router";
import { QueryProvider } from "../../lib/query-client";

export default function AppLayout() {
  return (
    <QueryProvider>
      <div className="vt-page-root">
        <Outlet />
      </div>
    </QueryProvider>
  );
}
