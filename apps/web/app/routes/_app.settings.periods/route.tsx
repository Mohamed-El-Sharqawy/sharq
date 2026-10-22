// `/settings/periods` under the `_app` layout (SPEC §11 periods row —
// admin only, FR-SET-07).
import { AdminGate } from "../../features/auth/admin-gate";
import { usePeriodsScreen } from "../../features/settings/periods/logic";
import { PeriodsView } from "../../features/settings/periods/view";

export default function PeriodsRoute() {
  return (
    <AdminGate>
      <PeriodsScreen />
    </AdminGate>
  );
}

function PeriodsScreen() {
  return <PeriodsView screen={usePeriodsScreen()} />;
}
