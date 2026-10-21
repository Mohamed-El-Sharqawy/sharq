// §10.4 envelope mapping for the teams/memberships service results — the
// one place that translates the modules' discriminated unions into
// ready-to-return error responses (status + envelope + field details).
// DUPLICATE carries no row: the conflicting membership stays as it was
// (proven at DB level by the row-3 integration suites, EC-08/11).
import { apiErrorStatus } from "../lib/errors";
import type {
  AddMemberResult,
  UpdateMemberResult,
  UpdateTeamResult,
} from "../modules/teams/service";

/** §10.4: CONFLICT_VERSION returns the current row (EC-16) — it rides meta
 * like RATE_LIMITED's retryAfterSeconds does. */
const conflict = (current: unknown) =>
  apiErrorStatus("CONFLICT_VERSION", undefined, { current });

/** A supervisor id that isn't a live supervisor: missing row → 404, wrong
 * role → 422 with the field (the auth wrong-current precedent — §10.4 has
 * no dedicated code). */
export const supervisorError = (
  code: "SUPERVISOR_NOT_FOUND" | "SUPERVISOR_ROLE",
) =>
  code === "SUPERVISOR_NOT_FOUND"
    ? apiErrorStatus("NOT_FOUND")
    : apiErrorStatus("VALIDATION_FAILED", { field: "supervisorId" });

export const teamError = (result: Exclude<UpdateTeamResult, { ok: true }>) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "CONFLICT_VERSION") return conflict(result.current);
  return supervisorError(result.code);
};

export const addMemberError = (
  result: Exclude<AddMemberResult, { ok: true }>,
) => {
  if (result.code === "TEAM_NOT_FOUND" || result.code === "USER_NOT_FOUND")
    return apiErrorStatus("NOT_FOUND");
  if (result.code === "INACTIVE_USER")
    return apiErrorStatus("VALIDATION_FAILED", { field: "userId" });
  if (result.code === "VALIDATION_FAILED")
    return apiErrorStatus("VALIDATION_FAILED", { field: result.field });
  if (result.code === "DUPLICATE") return apiErrorStatus("DUPLICATE");
  // The insert-race CONFLICT_VERSION has no row to return.
  return apiErrorStatus("CONFLICT_VERSION");
};

export const updateMemberError = (
  result: Exclude<UpdateMemberResult, { ok: true }>,
) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "VALIDATION_FAILED")
    return apiErrorStatus("VALIDATION_FAILED", { field: result.field });
  if (result.code === "DUPLICATE") return apiErrorStatus("DUPLICATE");
  return conflict(result.current);
};
