// SPEC §11: pathless `_app` layout — session + role guards land with
// Phase 1/2. SPEC §14.3: this outlet wrapper is THE page root — the only
// element (with the future sheet card) carrying a view-transition-name.
import { Outlet } from "react-router";

export default function AppLayout() {
  return (
    <div className="vt-page-root">
      <Outlet />
    </div>
  );
}
