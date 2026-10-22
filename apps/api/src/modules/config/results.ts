// Service input/result unions for the config module (§10.1 layering):
// granular codes for the plugins to map onto §10.4 envelopes (Phase-2
// pattern — services stay granular, plugins translate).
import type { SettingValues } from "@sharq/schemas";
import type {
  HolidayRecord,
  RateRecord,
  ReasonRecord,
  SettingRecord,
  StatusRecord,
} from "./types";

export type UpdateSettingInput = {
  actorId: string;
  key: string;
  value: unknown;
  validFrom?: string;
  note?: string;
  version: number;
};
export type UpdateSettingResult =
  | { ok: true; setting: SettingRecord }
  | { ok: false; code: "NOT_FOUND" }
  | {
      ok: false;
      code: "VALIDATION_FAILED";
      field: string;
      issues: { key: string; code: string }[];
    }
  | { ok: false; code: "CONFLICT_VERSION"; current: SettingValuesConflict }
  | { ok: false; code: "PERIOD_LOCKED" | "PERIOD_PAID" };

/** EC-53's "fresh value to the loser" — resolved value + its version token. */
export type SettingValuesConflict = {
  key: string;
  value: unknown;
  validFrom: string | null;
  version: number;
};

export type ResolvedSettings = {
  values: SettingValues;
  /** Per-key concurrency token: winning row's version, 0 = seed. */
  versions: Record<string, number>;
  /** Latest row per key ANY date (valid_from order, ties → later insert):
   * the write target a PATCH supersedes; null = no row yet. */
  latestRow: Record<
    string,
    {
      id: string;
      value: unknown;
      validFrom: string;
      version: number;
    } | null
  >;
};

export type SettingImpact = {
  key: string;
  kind: "future-periods" | "future-entries" | "none";
  validFrom: string;
  affectedEmployees: number;
  futureViolatingEntries: number;
};

export type ImpactInput = { key: string; value: unknown; validFrom?: string };
export type ImpactResult =
  | { ok: true; impact: SettingImpact }
  | { ok: false; code: "NOT_FOUND" }
  | {
      ok: false;
      code: "VALIDATION_FAILED";
      field: string;
      issues: { path: string; message: string }[];
    };

export type CreateRateInput = {
  actorId: string;
  scopeType: string;
  scopeKey?: string;
  amountMinor: number;
  validFrom: string;
  note?: string;
};
export type CreateRateResult =
  | { ok: true; rate: RateRecord }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VALIDATION_FAILED"; field: string; reason?: string }
  | { ok: false; code: "DUPLICATE" }
  | { ok: false; code: "PERIOD_LOCKED" | "PERIOD_PAID" };

export type UpdateRateInput = {
  actorId: string;
  rateId: string;
  validTo?: string | null;
  amountMinor?: number;
  version: number;
};
export type UpdateRateResult =
  | { ok: true; rate: RateRecord }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VALIDATION_FAILED"; field: string; reason?: string }
  | { ok: false; code: "CONFLICT_VERSION"; current: RateRecord }
  | { ok: false; code: "DUPLICATE" }
  | { ok: false; code: "PERIOD_LOCKED" | "PERIOD_PAID" };

export type CreateReasonInput = {
  actorId: string;
  kind: string;
  nameAr: string;
  defaultAmountMinor?: number | null;
};
export type CreateReasonResult =
  | { ok: true; reason: ReasonRecord }
  | { ok: false; code: "VALIDATION_FAILED"; field: string; reason?: string };

export type UpdateReasonInput = {
  actorId: string;
  reasonId: string;
  patch: {
    nameAr?: string;
    defaultAmountMinor?: number | null;
    isActive?: boolean;
  };
  version: number;
};
export type UpdateReasonResult =
  | { ok: true; reason: ReasonRecord }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VALIDATION_FAILED"; field: string; reason?: string }
  | { ok: false; code: "CONFLICT_VERSION"; current: ReasonRecord };

export type CreateStatusInput = {
  actorId: string;
  code: string;
  nameAr: string;
  carriesPay: boolean;
};
export type CreateStatusResult =
  { ok: true; status: StatusRecord } | { ok: false; code: "DUPLICATE" };

export type UpdateStatusInput = {
  actorId: string;
  statusId: string;
  patch: { nameAr?: string; carriesPay?: boolean; isActive?: boolean };
  version: number;
};
export type UpdateStatusResult =
  | { ok: true; status: StatusRecord }
  | { ok: false; code: "NOT_FOUND" }
  | { ok: false; code: "VALIDATION_FAILED"; field: string; reason?: string }
  | { ok: false; code: "CONFLICT_VERSION"; current: StatusRecord };

export type CreateHolidayInput = {
  actorId: string;
  date: string;
  nameAr: string;
};
export type CreateHolidayResult =
  { ok: true; holiday: HolidayRecord } | { ok: false; code: "DUPLICATE" };

export type DeleteHolidayResult =
  { ok: true; holiday: HolidayRecord } | { ok: false; code: "NOT_FOUND" };
