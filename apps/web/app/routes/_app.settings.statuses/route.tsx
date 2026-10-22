// `/settings/statuses` under the `_app` layout (SPEC §11 statuses row —
// admin only, FR-SET-05).
import { AdminGate } from "../../features/auth/admin-gate";
import { useStatusesScreen } from "../../features/settings/statuses/logic";
import { StatusesView } from "../../features/settings/statuses/view";

export default function StatusesRoute() {
  return (
    <AdminGate>
      <StatusesScreen />
    </AdminGate>
  );
}

function StatusesScreen() {
  return <StatusesView screen={useStatusesScreen()} />;
}
