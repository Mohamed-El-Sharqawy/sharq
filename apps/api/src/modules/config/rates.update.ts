// PATCH /api/rates/:id business rules (FR-SET-03, §10.6 notes EC-42/56):
// version token first (EC-16), amountMinor only on FUTURE rows (§10.6),
// and the closing rules — a company rate needs an active successor the
// next day (EC-56); a team/employee rate closing that WOULD change
// resolution (no successor) is period-guarded at the first changed day.
// A successor already covering that day means resolution is unchanged —
// no guard needed.
import { cairoToday } from "../../lib/cairo-today";
import { guardDateWritable, nextDay, successorAt } from "./date-guards";
import type { ConfigDeps } from "./update-setting";
import type { UpdateRateInput, UpdateRateResult } from "./results";

export async function updateRate(
  deps: ConfigDeps,
  input: UpdateRateInput,
  now: Date,
): Promise<UpdateRateResult> {
  const row = await deps.repo.rates.findRate(input.rateId);
  if (!row) return { ok: false, code: "NOT_FOUND" };
  if (input.version !== row.version)
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  const failure = await closingAndAmountFailure(deps, input, row, now);
  if (failure) return failure;
  const updated = await deps.repo.rates.updateRate(
    input.rateId,
    { validTo: input.validTo, amountMinor: input.amountMinor },
    input.version,
  );
  if (updated === "VERSION_CONFLICT")
    return { ok: false, code: "CONFLICT_VERSION", current: row };
  if (updated === "OVERLAP") return { ok: false, code: "DUPLICATE" };
  await deps.audit.record({
    action: "settings.rate_update",
    entityType: "rate",
    entityId: updated.id,
    actorId: input.actorId,
    oldValue: row,
    newValue: updated,
    note: null,
  });
  return { ok: true, rate: updated };
}

async function closingAndAmountFailure(
  deps: ConfigDeps,
  input: UpdateRateInput,
  row: { id: string; scopeType: string; scopeKey: string; validFrom: string },
  now: Date,
): Promise<UpdateRateResult | null> {
  if (
    input.amountMinor !== undefined &&
    row.validFrom <= cairoToday(now) // §10.6: "amountMinor? (future rows only)"
  ) {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: "amountMinor",
      reason: "FUTURE_ROWS_ONLY",
    };
  }
  if (input.validTo === undefined || input.validTo === null) return null;
  if (input.validTo < row.validFrom)
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: "validTo",
      reason: "BEFORE_VALID_FROM",
    };
  return closingFailure(deps, input, row);
}

/** EC-56 + the FR-SET-09 guard on the first day the closure changes. */
async function closingFailure(
  deps: ConfigDeps,
  input: UpdateRateInput,
  row: { scopeType: string; scopeKey: string },
): Promise<UpdateRateResult | null> {
  const dayAfter = nextDay(input.validTo as string);
  const scopeRows = await deps.repo.rates.ratesForScope(
    row.scopeType,
    row.scopeKey,
  );
  if (successorAt(scopeRows, dayAfter)) return null; // resolution unchanged
  if (row.scopeType === "company") {
    return {
      ok: false,
      code: "VALIDATION_FAILED",
      field: "validTo",
      reason: "COMPANY_RATE_NEEDS_SUCCESSOR",
    };
  }
  const problem = await guardDateWritable(deps.repo.guards, dayAfter);
  return problem ? { ok: false, code: problem } : null;
}
