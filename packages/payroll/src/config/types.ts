// Resolver input types — SPEC §5.1/§5.3. Plain structural shapes both the api
// (drizzle rows) and the web (cached query data) map into; the resolver itself
// stays pure: no React, no fetch, no drizzle (§9.1).
import type { IsoDate } from "@sharq/schemas";

// pay_rates company rows use this fixed scope_key (db seed convention, §5.6).
export const COMPANY_RATE_SCOPE_KEY = "company";

// §5.2/§5.6 seeded company rate = 400 EGP (minor units). Terminal fallback of
// the rate chain when no row covers the date anywhere (§5.3, EC-55).
export const SEEDED_COMPANY_RATE_MINOR = 40_000;

export type RateScopeType = "company" | "team" | "employee";
export type SettingScopeType = "company" | "team";

// §5.4: rows are dated valid_from/valid_to, null valid_to = open. valid_to is
// INCLUSIVE at the service layer (standing decision 2026-10-19) — see dates.ts.
export type DatedRow = {
  validFrom: IsoDate;
  validTo: IsoDate | null;
};

// One pay_rates row (§7): amount in integer minor units (> 0).
export type RateRow = DatedRow & {
  scopeType: RateScopeType;
  scopeKey: string; // company: COMPANY_RATE_SCOPE_KEY · team: teamId · employee: userId
  amountMinor: number;
};

// One team_memberships span (§7); the resolver reads it to find the team the
// employee belonged to ON the effective date (§5.3).
export type MembershipSpan = DatedRow & {
  teamId: string;
};

// Rate scope chain (§5.3): employee rows, the membership history for the
// team-at-date level, and every candidate row (employee's + his teams' + company).
export type RateScopeChain = {
  employeeId: string;
  memberships: MembershipSpan[];
  rates: RateRow[];
};

// One settings row (§7). Open-ended dating: valid_from only, so per scope
// level the LATEST row at-or-before the date wins. teamId is null on company
// rows (NULLS NOT DISTINCT unique, §7).
export type SettingRow = {
  key: string;
  scopeType: SettingScopeType;
  teamId: string | null;
  value: unknown;
  validFrom: IsoDate;
};

// Settings scope chain: the membership history feeds the team level (v1.1
// team override, §5.2 payroll.payday); the employee level has no settings
// surface — the settings table only knows company|team (§7 setting_scope_type).
export type SettingScopeChain = {
  memberships: MembershipSpan[];
  rows: SettingRow[];
};
