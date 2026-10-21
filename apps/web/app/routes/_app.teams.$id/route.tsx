// `/teams/:id` detail (SPEC §11 teams row — admin only; members live via
// the teamId-filtered users query, add-member doubles as transfer).
import { useParams } from "react-router";
import { AdminGate } from "../../features/auth/admin-gate";
import { useTeamDetail } from "../../features/teams/detail.logic";
import { TeamDetailView } from "../../features/teams/detail.view";

export default function TeamDetailRoute() {
  const { id } = useParams<{ id: string }>();
  return (
    <AdminGate>
      <TeamDetailScreen id={id} />
    </AdminGate>
  );
}

function TeamDetailScreen({ id }: { id: string | undefined }) {
  return <TeamDetailView detail={useTeamDetail(id)} />;
}
