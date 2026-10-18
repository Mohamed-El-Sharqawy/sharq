// `/` dashboard under the `_app` layout (SPEC §11).
// TEMP skeleton placeholder — FR-DSH (Phase 3) replaces the content.
import { Button } from "@sharq/ui/components/button";
import { APP_NAME, DASHBOARD_TITLE, DEMO_LINK } from "@sharq/locales";
import { Link } from "react-router";

export default function Dashboard() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <Button>{DASHBOARD_TITLE}</Button>
      {/* SPEC §14.3: in-app links navigate with view transitions. */}
      <Link to="/demo" viewTransition>
        {DEMO_LINK}
      </Link>
    </main>
  );
}
