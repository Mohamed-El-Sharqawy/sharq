// `/users` under the `_app` layout (SPEC §11 users row — admin only).
// The AdminGate bounces anonymous/expired sessions to /login and
// non-admins home; the server's 403 envelope is the real guard.
import { AdminGate } from "../../features/auth/admin-gate";
import { useUsersScreen } from "../../features/users/logic";
import { UsersView } from "../../features/users/view";

export default function UsersRoute() {
  return (
    <AdminGate>
      <UsersScreen />
    </AdminGate>
  );
}

function UsersScreen() {
  return <UsersView screen={useUsersScreen()} />;
}
