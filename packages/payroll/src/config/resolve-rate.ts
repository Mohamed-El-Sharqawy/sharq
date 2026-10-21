// resolveRate — SPEC §5.1/§5.3. Pure cascade over caller-supplied rows;
// first hit wins: employee → team (membership at the effective date) →
// company → seeded default (EC-55). Shared by api and web.
import type { IsoDate } from "@sharq/schemas";
import { coversDate, latestFrom, membershipTeamAt } from "./dates";
import {
  COMPANY_RATE_SCOPE_KEY,
  SEEDED_COMPANY_RATE_MINOR,
  type RateRow,
  type RateScopeChain,
  type RateScopeType,
} from "./types";

function coveringAmountAt(
  rates: RateRow[],
  scopeType: RateScopeType,
  scopeKey: string,
  date: IsoDate,
): number | null {
  const row = latestFrom(
    rates.filter(
      (r) =>
        r.scopeType === scopeType &&
        r.scopeKey === scopeKey &&
        coversDate(r, date),
    ),
  );
  return row === null ? null : row.amountMinor;
}

// §5.3 worked example verbatim: no employee row → team row covering the date →
// company row → seeded default; each level answers only if a row covers the
// date (inclusive bounds), so mid-week/backdated changes resolve per day.
export function resolveRate(chain: RateScopeChain, date: IsoDate): number {
  const employee = coveringAmountAt(
    chain.rates,
    "employee",
    chain.employeeId,
    date,
  );
  if (employee !== null) return employee;

  const teamId = membershipTeamAt(chain.memberships, date);
  if (teamId !== null) {
    const team = coveringAmountAt(chain.rates, "team", teamId, date);
    if (team !== null) return team;
  }

  const company = coveringAmountAt(
    chain.rates,
    "company",
    COMPANY_RATE_SCOPE_KEY,
    date,
  );
  // No row anywhere in the chain: the registry-seeded company rate resolves
  // (EC-55); a company row closed without successor is a write-side block,
  // not a resolver concern (EC-56 lands with the rates plugin).
  return company ?? SEEDED_COMPANY_RATE_MINOR;
}
