// `/` dashboard under the `_app` layout (SPEC §11).
// TEMP skeleton placeholder — FR-DSH (Phase 3) replaces the content.
import { Button } from "@sharq/ui/components/button";
import { APP_NAME, DASHBOARD_TITLE } from "@sharq/locales";

export default function Dashboard() {
  return (
    <main>
      <h1>{APP_NAME}</h1>
      <Button>{DASHBOARD_TITLE}</Button>
    </main>
  );
}
