// Reason-catalog business rules (FR-SET-04, EC-46): create + edit +
// deactivate-never-delete (the repo port has no delete op by design).
// A deduction default must stay within the CURRENT resolved
// deduction.maxPerEntryMinor when that cap is set (§5.2 table note).
import { resolvedSettings, resolvedValue } from "./resolved-settings";
import type { ConfigDeps } from "./update-setting";
import type { ReasonRecord } from "./types";
import type {
  CreateReasonInput,
  CreateReasonResult,
  UpdateReasonInput,
  UpdateReasonResult,
} from "./results";

export async function createReason(
  deps: ConfigDeps,
  input: CreateReasonInput,
): Promise<CreateReasonResult> {
  const violation = await deductionDefaultViolation(
    deps,
    input.kind,
    input.defaultAmountMinor ?? null,
  );
  if (violation) return DEFAULT_EXCEEDS_MAX;
  const reason = await deps.repo.catalogs.insertReason({
    kind: input.kind,
    nameAr: input.nameAr,
    defaultAmountMinor: input.defaultAmountMinor ?? null,
  });
  await deps.audit.record({
    action: "settings.reason_create",
    entityType: "reason",
    entityId: reason.id,
    actorId: input.actorId,
    oldValue: null,
    newValue: reason,
    note: null,
  });
  return { ok: true, reason };
}

export async function updateReason(
  deps: ConfigDeps,
  input: UpdateReasonInput,
): Promise<UpdateReasonResult> {
  const row = await deps.repo.catalogs.findReason(input.reasonId);
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (input.version !== row.version)
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  const nextDefault =
    input.patch.defaultAmountMinor !== undefined
      ? input.patch.defaultAmountMinor
      : row.defaultAmountMinor;
  if (await deductionDefaultViolation(deps, row.kind, nextDefault))
    return DEFAULT_EXCEEDS_MAX;
  const updated = await deps.repo.catalogs.updateReason(
    input.reasonId,
    input.patch,
    input.version,
  );
  if (updated === "VERSION_CONFLICT")
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  await auditReason(deps, input.actorId, row, updated);
  return { ok: true, reason: updated };
}

const DEFAULT_EXCEEDS_MAX = {
  ok: false,
  code: "VALIDATION_FAILED",
  field: "defaultAmountMinor",
  reason: "DEFAULT_EXCEEDS_DEDUCTION_MAX",
} as const;

/** §5.2: "deduction default ≤ deduction max" — only when the cap is set
 * (null = uncapped) and the row is a deduction. */
async function deductionDefaultViolation(
  deps: ConfigDeps,
  kind: string,
  amount: number | null,
): Promise<boolean> {
  if (kind !== "deduction" || amount === null) return false;
  const resolved = await resolvedSettings(deps.repo.settings);
  const max = resolvedValue(resolved, "deduction.maxPerEntryMinor");
  return typeof max === "number" && amount > max;
}

async function auditReason(
  deps: ConfigDeps,
  actorId: string,
  old: ReasonRecord,
  updated: ReasonRecord,
): Promise<void> {
  await deps.audit.record({
    action: "settings.reason_update",
    entityType: "reason",
    entityId: updated.id,
    actorId,
    oldValue: old,
    newValue: updated,
    note: null,
  });
}
