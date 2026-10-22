// `/settings/entry` under the `_app` layout (SPEC §11 entry row — admin
// only, FR-SET-11).
import { AdminGate } from "../../features/auth/admin-gate";
import { useEntryScreen } from "../../features/settings/entry/logic";
import { EntryView } from "../../features/settings/entry/view";

export default function EntryRoute() {
  return (
    <AdminGate>
      <EntryScreen />
    </AdminGate>
  );
}

function EntryScreen() {
  return <EntryView screen={useEntryScreen()} />;
}
