// FR-ADM-01/02 — a team's supervisor must be a LIVE user with the
// supervisor role (§3: supervisors manage exactly their teams; admins act
// globally without needing a team row). Fixed rule with this citation —
// §5.2 defines no team-composition settings.
import type { UsersRepo } from "../users/service";
import type { SupervisorProblem } from "./types";

export async function checkSupervisor(
  users: UsersRepo,
  supervisorId: string,
): Promise<SupervisorProblem | "ok"> {
  const supervisor = await users.findUser(supervisorId);
  if (!supervisor) return "SUPERVISOR_NOT_FOUND";
  if (supervisor.role !== "supervisor") return "SUPERVISOR_ROLE";
  return "ok";
}
