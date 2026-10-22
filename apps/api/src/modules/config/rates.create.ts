// POST /api/rates business rules (FR-SET-03): scope normalization, target
// existence, the FR-SET-09/EC-42 period guard (rates are inherently dated —
// every validFrom is guarded), the INCLUSIVE overlap pre-check (2026-10-19
// decision — the §7 exclusion is the race backstop) and the audit row.
import { guardDateWritable, overlapsInclusive } from "./date-guards";
import type { ConfigDeps } from "./update-setting";
import type { CreateRateInput, CreateRateResult } from "./results";

/** §5.6 seed convention: company rows carry the fixed scope key. */
const COMPANY_SCOPE_KEY = "company";

export async function createRate(
  deps: ConfigDeps,
  input: CreateRateInput,
): Promise<CreateRateResult> {
  const scopeKey =
    input.scopeType === "company" ? COMPANY_SCOPE_KEY : input.scopeKey;
  if (!scopeKey)
    return { ok: false, code: "VALIDATION_FAILED", field: "scopeKey" };
  if (await scopeTargetMissing(deps, input, scopeKey))
    return { ok: false, code: "NOT_FOUND" };
  const problem = await guardDateWritable(deps.repo.guards, input.validFrom);
  if (problem) return { ok: false, code: problem };
  const rows = await deps.repo.rates.ratesForScope(input.scopeType, scopeKey);
  const overlapping = rows.some((r) =>
    overlapsInclusive({ validFrom: input.validFrom, validTo: null }, r),
  );
  if (overlapping) return { ok: false, code: "DUPLICATE" };
  return insertRate(deps, input, scopeKey);
}

/** team/employee rates point at a real team/user (existence only — EC-58
 * keeps deactivated users' history addressable). */
async function scopeTargetMissing(
  deps: ConfigDeps,
  input: CreateRateInput,
  scopeKey: string,
): Promise<boolean> {
  if (input.scopeType === "company") return false;
  const exists =
    input.scopeType === "team"
      ? await deps.repo.guards.teamExists(scopeKey)
      : await deps.repo.guards.userExists(scopeKey);
  return !exists;
}

async function insertRate(
  deps: ConfigDeps,
  input: CreateRateInput,
  scopeKey: string,
): Promise<CreateRateResult> {
  const rate = await deps.repo.rates.insertRate({
    scopeType: input.scopeType,
    scopeKey,
    amountMinor: input.amountMinor,
    validFrom: input.validFrom,
    note: input.note ?? null,
    createdBy: input.actorId,
  });
  if (rate === "OVERLAP") return { ok: false, code: "DUPLICATE" };
  await deps.audit.record({
    action: "settings.rate_create",
    entityType: "rate",
    entityId: rate.id,
    actorId: input.actorId,
    oldValue: null,
    newValue: rate,
    note: input.note ?? null,
  });
  return { ok: true, rate };
}
