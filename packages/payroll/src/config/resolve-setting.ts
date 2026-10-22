// resolveSetting — SPEC §5.1/§5.3. Pure cascade over caller-supplied rows:
// team (membership at the effective date) → company → the key's seeded
// default from the registry (EC-55). Compile-time parity: the return type is
// the registry's Static schema for the key, so api and web cannot drift.
import type { IsoDate, SettingKey, SettingValues } from "@sharq/schemas";
import { SETTINGS_REGISTRY } from "@sharq/schemas";
import { latestFrom, membershipTeamAt } from "./dates";
import type { SettingRow, SettingScopeChain, SettingScopeType } from "./types";

type ScopeTarget = {
  scopeType: SettingScopeType;
  teamId: string | null;
};

// Settings rows are open-ended (valid_from only, §7): among rows for this
// key+scope, the latest at-or-before the date wins. Returns the ROW, not its
// value — null is a legal stored value (e.g. deduction.maxPerEntryMinor), so
// only an absent row may fall through the cascade.
function latestRowAt(
  rows: SettingRow[],
  key: string,
  target: ScopeTarget,
  date: IsoDate,
): SettingRow | null {
  return latestFrom(
    rows.filter(
      (r) =>
        r.key === key &&
        r.scopeType === target.scopeType &&
        r.teamId === target.teamId &&
        r.validFrom <= date,
    ),
  );
}

export function resolveSetting<K extends SettingKey>(
  key: K,
  chain: SettingScopeChain,
  date: IsoDate,
): SettingValues[K] {
  // v1 keys are company-scoped (§5.2); the team level exists for the v1.1
  // payroll.payday override. No employee level: the settings table only
  // knows company|team (§7 setting_scope_type).
  const teamId = membershipTeamAt(chain.memberships, date);
  if (teamId !== null) {
    const team = latestRowAt(
      chain.rows,
      key,
      { scopeType: "team", teamId },
      date,
    );
    if (team !== null) return team.value as SettingValues[K];
  }
  const company = latestRowAt(
    chain.rows,
    key,
    { scopeType: "company", teamId: null },
    date,
  );
  if (company !== null) return company.value as SettingValues[K];
  // Registry lookup is definitionally Static<registry[K]["schema"]> = the
  // return type for each concrete key; TS just cannot distribute the generic
  // (defaults union includes null). Default↔schema agreement is pinned by the
  // registry completeness tests (schemas, Phase 0 rows 1–2).
  return SETTINGS_REGISTRY[key].seededDefault as SettingValues[K];
}
