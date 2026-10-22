// `/settings/rates` under the `_app` layout (SPEC §11 rates row — admin
// only, FR-SET-03).
import { AdminGate } from "../../features/auth/admin-gate";
import { useRatesScreen } from "../../features/settings/rates/logic";
import { RatesView } from "../../features/settings/rates/view";

export default function RatesRoute() {
  return (
    <AdminGate>
      <RatesScreen />
    </AdminGate>
  );
}

function RatesScreen() {
  return <RatesView screen={useRatesScreen()} />;
}
