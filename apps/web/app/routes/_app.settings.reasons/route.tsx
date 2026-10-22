// `/settings/reasons` under the `_app` layout (SPEC §11 reasons row —
// admin only, FR-SET-04).
import { AdminGate } from "../../features/auth/admin-gate";
import { useReasonsScreen } from "../../features/settings/reasons/logic";
import { ReasonsView } from "../../features/settings/reasons/view";

export default function ReasonsRoute() {
  return (
    <AdminGate>
      <ReasonsScreen />
    </AdminGate>
  );
}

function ReasonsScreen() {
  return <ReasonsView screen={useReasonsScreen()} />;
}
