// §10.4 envelope mapping for the config service results — the one place
// that translates the modules/config discriminated unions into ready-to-
// return responses. CONFLICT_VERSION rides meta.current (EC-16/53 fresh
// value; the Phase-2 precedent), VALIDATION_FAILED carries the field and
// its machine-readable issues/reason, PERIOD_LOCKED/PERIOD_PAID map from
// the guard codes verbatim.
import { apiErrorStatus } from "../lib/errors";
import type {
  CreateRateResult,
  CreateReasonResult,
  ImpactResult,
  UpdateRateResult,
  UpdateSettingResult,
} from "../modules/config/service";
import type {
  UpdateReasonResult,
  UpdateStatusResult,
} from "../modules/config/results";

type FieldFailure = { field: string; reason?: string; issues?: unknown };

const fieldFailure = (f: FieldFailure) => {
  const details: Record<string, unknown> = { field: f.field };
  if (f.reason !== undefined) details.reason = f.reason;
  if (f.issues !== undefined) details.issues = f.issues;
  return apiErrorStatus("VALIDATION_FAILED", details);
};

const conflict = (current: unknown) =>
  apiErrorStatus("CONFLICT_VERSION", undefined, { current });

export const settingError = (
  result: Exclude<UpdateSettingResult, { ok: true }>,
) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "CONFLICT_VERSION") return conflict(result.current);
  if (result.code === "VALIDATION_FAILED")
    return fieldFailure({ field: result.field, issues: result.issues });
  return apiErrorStatus(result.code); // PERIOD_LOCKED / PERIOD_PAID
};

export const impactError = (result: Exclude<ImpactResult, { ok: true }>) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  return fieldFailure({ field: result.field, issues: result.issues });
};

/** Create + update rate failures share one mapper (§9.3 — same §10.4
 * vocabulary, one place). */
export const rateError = (
  result:
    | Exclude<CreateRateResult, { ok: true }>
    | Exclude<UpdateRateResult, { ok: true }>,
) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "CONFLICT_VERSION") return conflict(result.current);
  if (result.code === "DUPLICATE") return apiErrorStatus("DUPLICATE");
  if (result.code === "VALIDATION_FAILED")
    return fieldFailure({ field: result.field, reason: result.reason });
  return apiErrorStatus(result.code);
};

export const catalogError = (
  result:
    | Exclude<UpdateReasonResult, { ok: true }>
    | Exclude<UpdateStatusResult, { ok: true }>,
) => {
  if (result.code === "NOT_FOUND") return apiErrorStatus("NOT_FOUND");
  if (result.code === "CONFLICT_VERSION") return conflict(result.current);
  return fieldFailure({ field: result.field, reason: result.reason });
};

/** Reason creation can only fail on the deduction-max rule (duplicates are
 * impossible — inserts mint fresh rows). */
export const createReasonError = (
  result: Exclude<CreateReasonResult, { ok: true }>,
) => fieldFailure({ field: result.field, reason: result.reason });
