// `/settings/policies` under the `_app` layout (SPEC §11 policies row —
// admin only).
import { AdminGate } from "../../features/auth/admin-gate";
import { usePoliciesScreen } from "../../features/settings/policies/logic";
import { PoliciesView } from "../../features/settings/policies/view";

export default function PoliciesRoute() {
  return (
    <AdminGate>
      <PoliciesScreen />
    </AdminGate>
  );
}

function PoliciesScreen() {
  return <PoliciesView screen={usePoliciesScreen()} />;
}
