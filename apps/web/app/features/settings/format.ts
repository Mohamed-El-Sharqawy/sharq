// apps/web — settings display/input formatting (SPEC §14.2): money parses
// through the @sharq/schemas normalizer at the input boundary (EC-31), and
// every number/date renders through Intl with the resolved
// `format.digitStyle`. Money never round-trips: display strings are
// display-only (§5.5 money decision).
import {
  minorToDecimal,
  normalizeAmountToMinor,
  type MoneyNormalizeErrorCode,
  type SettingValues,
} from "@sharq/schemas";
import { MONEY_ERROR_MESSAGES, MONEY_TOO_MANY_DECIMALS } from "@sharq/locales";

type DigitStyle = SettingValues["format.digitStyle"];

function moneyMessage(code: MoneyNormalizeErrorCode, scale: number): string {
  return code === "TOO_MANY_DECIMALS"
    ? MONEY_TOO_MANY_DECIMALS(scale)
    : MONEY_ERROR_MESSAGES[code];
}

/** Human money input → integer minor (the ONLY conversion site, §6.2). */
export function parseMoneyInput(
  input: string,
  scale: number,
): { ok: true; minor: number } | { ok: false; message: string } {
  const result = normalizeAmountToMinor(input, scale);
  return result.ok
    ? result
    : { ok: false, message: moneyMessage(result.code, scale) };
}

/** Integer minor → display string via the §14.2 Intl formatting. */
export function formatMoney(
  minor: number,
  scale: number,
  digitStyle: DigitStyle,
): string {
  return new Intl.NumberFormat("ar-EG", {
    numberingSystem: digitStyle,
    maximumFractionDigits: scale,
  }).format(minorToDecimal(minor, scale));
}

export function formatNumber(n: number, digitStyle: DigitStyle): string {
  return new Intl.NumberFormat("ar-EG", { numberingSystem: digitStyle }).format(
    n,
  );
}

/** ISO date label (YYYY-MM-DD) → «١٤ أكتوبر» shape (§5.4's examples).
 * Date-only math stays UTC so the label never shifts a day. */
export function formatDateLabel(iso: string, digitStyle: DigitStyle): string {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    numberingSystem: digitStyle,
  }).format(new Date(`${iso}T00:00:00Z`));
}
