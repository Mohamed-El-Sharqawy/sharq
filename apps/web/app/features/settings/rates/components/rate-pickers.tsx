// apps/web — the rate dialog's scope + target pickers (§11 rates row):
// company needs no target; team/employee pick from the directory queries
// (cached — the screen already loads them).
import type { RateScope } from "@sharq/schemas";
import {
  RATES_SCOPE_COMPANY,
  RATES_SCOPE_EMPLOYEE,
  RATES_SCOPE_LABEL,
  RATES_SCOPE_TEAM,
  RATES_TARGET_TEAM,
  RATES_TARGET_USER,
} from "@sharq/locales";
import { SelectField } from "@sharq/ui";
import { useTeamsPage } from "../../../teams/queries";
import { useUsersPage } from "../../../users/queries";

export function RateScopePicker({
  scopeType,
  onChange,
}: {
  scopeType: RateScope;
  onChange: (scopeType: RateScope) => void;
}) {
  return (
    <SelectField
      label={RATES_SCOPE_LABEL}
      value={scopeType}
      onChange={(value) => onChange(value as RateScope)}
    >
      <option value="company">{RATES_SCOPE_COMPANY}</option>
      <option value="team">{RATES_SCOPE_TEAM}</option>
      <option value="employee">{RATES_SCOPE_EMPLOYEE}</option>
    </SelectField>
  );
}

export function RateTargetPicker({
  scopeType,
  scopeKey,
  onChange,
}: {
  scopeType: Exclude<RateScope, "company">;
  scopeKey: string;
  onChange: (scopeKey: string) => void;
}) {
  const teams = useTeamsPage({ pageSize: "100" });
  const users = useUsersPage({ pageSize: "100" });
  if (scopeType === "team") {
    return (
      <SelectField
        label={RATES_TARGET_TEAM}
        value={scopeKey}
        onChange={onChange}
        placeholderOption="—"
      >
        {(teams.data?.items ?? []).map((team) => (
          <option key={team.id} value={team.id}>
            {team.nameAr}
          </option>
        ))}
      </SelectField>
    );
  }
  return (
    <SelectField
      label={RATES_TARGET_USER}
      value={scopeKey}
      onChange={onChange}
      placeholderOption="—"
    >
      {(users.data?.items ?? []).map((user) => (
        <option key={user.id} value={user.id}>
          {user.displayNameAr}
        </option>
      ))}
    </SelectField>
  );
}
