// `/` dashboard under the `_app` layout (SPEC §11).
// TEMP skeleton placeholder — FR-DSH (Phase 3) replaces the content.
// The users/teams links are the admin screens' entry points (Phase 2
// row 7); they render unconditionally (no session query HERE — the
// routes.test.tsx render spec mounts this component bare, and the
// screens' role gate + the server 403 do the guarding). Role-aware nav
// lands with the real dashboard shell.
import { Button } from "@sharq/ui/components/button";
import {
  APP_NAME,
  DASHBOARD_TITLE,
  DEMO_LINK,
  SETTINGS_TITLE,
  TEAMS_TITLE,
  USERS_TITLE,
} from "@sharq/locales";
import { Link } from "react-router";

export default function Dashboard() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <Button>{DASHBOARD_TITLE}</Button>
      <nav className="flex gap-3">
        <Link to="/users" viewTransition>
          {USERS_TITLE}
        </Link>
        <Link to="/teams" viewTransition>
          {TEAMS_TITLE}
        </Link>
        {/* The settings section's entry point (Phase 3 row 12); the seven
         * v1 screens cross-link through the section nav (SettingsNav). */}
        <Link to="/settings/rates" viewTransition>
          {SETTINGS_TITLE}
        </Link>
      </nav>
      {/* SPEC §14.3: in-app links navigate with view transitions. */}
      <Link to="/demo" viewTransition>
        {DEMO_LINK}
      </Link>
    </main>
  );
}
