// `/teams` under the `_app` layout (SPEC §11 teams row — admin only).
import { AdminGate } from "../../features/auth/admin-gate";
import { useTeamsScreen } from "../../features/teams/logic";
import { TeamsView } from "../../features/teams/view";

export default function TeamsRoute() {
  return (
    <AdminGate>
      <TeamsScreen />
    </AdminGate>
  );
}

function TeamsScreen() {
  return <TeamsView screen={useTeamsScreen()} />;
}
