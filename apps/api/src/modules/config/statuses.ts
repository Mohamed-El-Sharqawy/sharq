// Attendance-status business rules (FR-SET-05): add custom statuses,
// edit/deactivate custom ones; «حضور»/«غياب» system rows are protected —
// carries_pay immutable (§5.7: the formula depends on it) and never
// deactivatable. No delete path exists (EC-46's never-delete applies to
// statuses too — history references them).
import type { ConfigDeps } from "./update-setting";
import type { StatusRecord } from "./types";
import type {
  CreateStatusInput,
  CreateStatusResult,
  UpdateStatusInput,
  UpdateStatusResult,
} from "./results";

export async function createStatus(
  deps: ConfigDeps,
  input: CreateStatusInput,
): Promise<CreateStatusResult> {
  const status = await deps.repo.catalogs.insertStatus(input); // 23505 → DUPLICATE
  if (status === "DUPLICATE") return { ok: false, code: "DUPLICATE" };
  await deps.audit.record({
    action: "settings.status_create",
    entityType: "status",
    entityId: status.id,
    actorId: input.actorId,
    oldValue: null,
    newValue: status,
    note: null,
  });
  return { ok: true, status };
}

export async function updateStatus(
  deps: ConfigDeps,
  input: UpdateStatusInput,
): Promise<UpdateStatusResult> {
  const row = await deps.repo.catalogs.findStatus(input.statusId);
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (input.version !== row.version)
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  const failure = systemProtectionFailure(row, input.patch);
  if (failure) return failure;
  const updated = await deps.repo.catalogs.updateStatus(
    input.statusId,
    input.patch,
    input.version,
  );
  if (updated === "VERSION_CONFLICT")
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  await deps.audit.record({
    action: "settings.status_update",
    entityType: "status",
    entityId: updated.id,
    actorId: input.actorId,
    oldValue: row,
    newValue: updated,
    note: null,
  });
  return { ok: true, status: updated };
}

/** System rows keep their carries-pay flag and stay active; renaming is
 * allowed (display label only — FR-SET-05's protection names undeletable
 * + carries_pay immutable, nothing else). */
function systemProtectionFailure(
  row: StatusRecord,
  patch: { carriesPay?: boolean; isActive?: boolean },
): UpdateStatusResult | null {
  if (!row.isSystem) return null;
  if (patch.carriesPay !== undefined && patch.carriesPay !== row.carriesPay)
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: "carriesPay",
      reason: "SYSTEM_PROTECTED",
    };
  if (patch.isActive === false)
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: "isActive",
      reason: "SYSTEM_PROTECTED",
    };
  return null;
}
