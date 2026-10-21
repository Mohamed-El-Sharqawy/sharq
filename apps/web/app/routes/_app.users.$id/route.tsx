// `/users/:id` profile (SPEC §11 users row — admin only; the history
// block arrives with the audit read in Phase 8).
import { useParams } from "react-router";
import { AdminGate } from "../../features/auth/admin-gate";
import { useUserProfile } from "../../features/users/detail.logic";
import { UserDetailView } from "../../features/users/detail.view";

export default function UserDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminGate>
      <UserDetailScreen id={id} />
    </AdminGate>
  );
}

function UserDetailScreen({ id }: { id: string | undefined }) {
  return <UserDetailView profile={useUserProfile(id)} />;
}
