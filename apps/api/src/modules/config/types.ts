// SPEC §10.1 — the configuration module's domain records + repository
// ports (settings rows, pay_rates, catalogs, holidays + the §5.5.6
// change-safety lookups). Plain structural shapes; drizzle lives only in
// the repository files. valid_to is INCLUSIVE everywhere (standing
// decision 2026-10-19) — the DB daterange exclusion is the backstop, the
// service pre-checks on inclusive day labels.
export type SettingRecord = {
  id: string;
  key: string;
  value: unknown;
  validFrom: string;
  version: number;
  updatedBy: string | null;
};

export type RateRecord = {
  id: string;
  scopeType: "company" | "team" | "employee";
  scopeKey: string;
  amountMinor: number;
  validFrom: string;
  validTo: string | null;
  note: string | null;
  version: number;
};

export type ReasonRecord = {
  id: string;
  kind: "override" | "deduction";
  nameAr: string;
  defaultAmountMinor: number | null;
  isActive: boolean;
  sortOrder: number;
  version: number;
};

export type StatusRecord = {
  id: string;
  code: string;
  nameAr: string;
  carriesPay: boolean;
  isSystem: boolean;
  isActive: boolean;
  version: number;
};

export type HolidayRecord = { id: string; date: string; nameAr: string };

export interface SettingsRepo {
  /** Every company-scope row — one read powers the resolved map (GET),
   * the per-key versions and the cross-field merge. */
  allCompanyRows(): Promise<SettingRecord[]>;
  /** Latest row for the key by valid_from (then created_at) — the row a
   * PATCH supersedes; undefined means the registry seed is in effect. */
  latestRowForKey(key: string): Promise<SettingRecord | undefined>;
  insertRow(input: {
    key: string;
    value: unknown;
    validFrom: string;
    version: number;
    updatedBy: string;
  }): Promise<SettingRecord | "ROW_RACE">;
  /** Conditional on version; 0 rows = "VERSION_CONFLICT". */
  updateRowValue(
    id: string,
    value: unknown,
    expectedVersion: number,
    updatedBy: string,
  ): Promise<SettingRecord | "VERSION_CONFLICT">;
}

export interface RatesRepo {
  listRates(): Promise<RateRecord[]>;
  ratesForScope(scopeType: string, scopeKey: string): Promise<RateRecord[]>;
  findRate(id: string): Promise<RateRecord | undefined>;
  /** EC-42 backstop: the §7 exclusion rejecting an overlapping insert. */
  insertRate(input: {
    scopeType: string;
    scopeKey: string;
    amountMinor: number;
    validFrom: string;
    note: string | null;
    createdBy: string;
  }): Promise<RateRecord | "OVERLAP">;
  /** validTo + amountMinor in one conditional write. */
  updateRate(
    id: string,
    patch: { validTo?: string | null; amountMinor?: number },
    expectedVersion: number,
  ): Promise<RateRecord | "VERSION_CONFLICT" | "OVERLAP">;
}

export interface CatalogsRepo {
  listReasons(): Promise<ReasonRecord[]>;
  findReason(id: string): Promise<ReasonRecord | undefined>;
  insertReason(input: {
    kind: string;
    nameAr: string;
    defaultAmountMinor: number | null;
  }): Promise<ReasonRecord>;
  updateReason(
    id: string,
    patch: {
      nameAr?: string;
      defaultAmountMinor?: number | null;
      isActive?: boolean;
    },
    expectedVersion: number,
  ): Promise<ReasonRecord | "VERSION_CONFLICT">;

  listStatuses(): Promise<StatusRecord[]>;
  findStatus(id: string): Promise<StatusRecord | undefined>;
  /** 23505 (code unique) surfaces as "DUPLICATE". */
  insertStatus(input: {
    code: string;
    nameAr: string;
    carriesPay: boolean;
  }): Promise<StatusRecord | "DUPLICATE">;
  updateStatus(
    id: string,
    patch: {
      nameAr?: string;
      carriesPay?: boolean;
      isActive?: boolean;
    },
    expectedVersion: number,
  ): Promise<StatusRecord | "VERSION_CONFLICT">;
}

export interface HolidaysRepo {
  listHolidays(): Promise<HolidayRecord[]>;
  findHoliday(id: string): Promise<HolidayRecord | undefined>;
  /** 23505 (date unique) surfaces as "DUPLICATE". */
  insertHoliday(input: {
    date: string;
    nameAr: string;
    createdBy: string;
  }): Promise<HolidayRecord | "DUPLICATE">;
  deleteHoliday(id: string): Promise<HolidayRecord | undefined>;
}

/** §5.5.6 change-safety lookups + the impact-preview counts. */
export interface ConfigGuardsRepo {
  /** Strictest period state covering the date across teams (company-wide
   * guard): paid > locked > open; undefined when no period covers it. */
  strictestPeriodStateCovering(
    date: string,
  ): Promise<"open" | "locked" | "paid" | undefined>;
  /** EC-52: any attendance row ever stored (soft-deleted included — the
   * scale corrupted those integers too when they were written). */
  hasAnyAttendance(): Promise<boolean>;
  /** §5.5.6 bounds preview: entries dated on/after the change whose stored
   * amount leaves the new bounds. Past entries are snapshotted — exempt. */
  countFutureViolatingEntries(
    validFrom: string,
    minMinor: number,
    maxMinor: number,
  ): Promise<number>;
  /** Employees whose live membership covers the date (impact count). */
  countEmployeesLiveAt(date: string): Promise<number>;
  teamExists(id: string): Promise<boolean>;
  userExists(id: string): Promise<boolean>;
}

/** The one injected bundle (AppDeps.configRepo) — the drizzle composition
 * lives in repository.ts. */
export type ConfigRepo = {
  settings: SettingsRepo;
  rates: RatesRepo;
  catalogs: CatalogsRepo;
  holidays: HolidaysRepo;
  guards: ConfigGuardsRepo;
};
