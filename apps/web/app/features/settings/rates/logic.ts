// apps/web â€” /settings/rates screen logic (SPEC آ§11 rates row, FR-SET-03):
// the effective-dated timeline grouped per scope. The add dialog is
// self-contained (its own draft + the create mutation) with the static
// impact note â€” آ§5.4-2's آ«ط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„ظ‚ط¯ظٹظ…ط© ظ…ط´ ظ‡طھطھط؛ظٹط±آ»; there is no rates
// impact endpoint, the server guards do the real checking. Close/reopen
// row actions live in dialog.ts (آ§9.2/آ§9.3 split).
import { useState } from "react";
import type {
  RateResponse,
  RateScope,
  RatesResponseBody,
  SettingsResponseBody,
} from "@sharq/schemas";
import {
  RATES_SCOPE_COMPANY,
  RATES_SCOPE_EMPLOYEE,
  RATES_SCOPE_TEAM,
  RATES_UNTITLED_SCOPE,
} from "@sharq/locales";
import { errorMessage } from "../../../lib/sharq-error";
import { useRates, useSettings } from "../queries";
import { useTeamsPage } from "../../teams/queries";
import { useUsersPage } from "../../users/queries";
import { useRateRowActions } from "./dialog";

export type RateGroup = {
  key: string;
  label: string;
  rows: RateResponse[];
};

const SCOPE_ORDER: RateScope[] = ["company", "team", "employee"];

function labelFor(
  scopeType: RateScope,
  scopeKey: string,
  teams: Map<string, string>,
  users: Map<string, string>,
): string {
  if (scopeType === "company") return RATES_SCOPE_COMPANY;
  const names = scopeType === "team" ? teams : users;
  const prefix = scopeType === "team" ? RATES_SCOPE_TEAM : RATES_SCOPE_EMPLOYEE;
  return `${prefix}: ${names.get(scopeKey) ?? RATES_UNTITLED_SCOPE}`;
}

function groupRates(
  rates: RateResponse[],
  teams: Map<string, string>,
  users: Map<string, string>,
): RateGroup[] {
  const groups = new Map<string, RateGroup>();
  for (const rate of rates) {
    const key = `${rate.scopeType}:${rate.scopeKey}`;
    const group = groups.get(key) ?? {
      key,
      label: labelFor(rate.scopeType, rate.scopeKey, teams, users),
      rows: [],
    };
    group.rows.push(rate);
    groups.set(key, group);
  }
  return sortByScope([...groups.values()]);
}

function sortByScope(groups: RateGroup[]): RateGroup[] {
  return groups
    .sort(
      (a, b) =>
        SCOPE_ORDER.indexOf(a.rows[0]!.scopeType) -
        SCOPE_ORDER.indexOf(b.rows[0]!.scopeType),
    )
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) =>
        a.validFrom.localeCompare(b.validFrom),
      ),
    }));
}

/** scopeKey â†’ display name, from the cached directory pages. */
function toNameMap<T extends { id: string }>(
  items: T[] | undefined,
  name: (item: T) => string,
): Map<string, string> {
  return new Map((items ?? []).map((item) => [item.id, name(item)]));
}

function rateRows(rates: RatesResponseBody | undefined): RateResponse[] {
  return rates?.rates ?? [];
}

function moneyDisplay(settingsData: SettingsResponseBody | undefined): {
  scale: number;
  digitStyle: "western" | "arabic_indic";
} {
  const values = settingsData?.values;
  return {
    scale: values?.["currency.minorUnitScale"] ?? 2,
    digitStyle: values?.["format.digitStyle"] ?? "western",
  };
}

export function useRatesScreen() {
  const rates = useRates();
  const settings = useSettings();
  const teamsQuery = useTeamsPage({ pageSize: "100" });
  const usersQuery = useUsersPage({ pageSize: "100" });
  const actions = useRateRowActions();
  const [addOpen, setAddOpen] = useState(false);

  const teams = toNameMap(teamsQuery.data?.items, (team) => team.nameAr);
  const users = toNameMap(usersQuery.data?.items, (user) => user.displayNameAr);
  const rows = rateRows(rates.data);

  return {
    isPending: rates.isPending,
    loadError: rates.isError ? errorMessage(rates.error) : null,
    retry: () => void rates.refetch(),
    groups: groupRates(rows, teams, users),
    hasRows: rows.length > 0,
    ...moneyDisplay(settings.data),
    addOpen,
    openAdd: () => setAddOpen(true),
    closeAdd: () => setAddOpen(false),
    ...actions,
  };
}

export type RatesScreen = ReturnType<typeof useRatesScreen>;
