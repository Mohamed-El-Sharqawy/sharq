// SPEC §6.2 / §14.2 — the money input normalizer. Money is integers in
// minor units everywhere; conversion from human input happens ONLY here at
// the input boundary (Arabic-Indic digits, `٫`, thousands separators —
// EC-31; the SERVER accepts integer minor only). The scale is
// `currency.minorUnitScale` (§5.2, int 2..4): callers resolve the setting
// and pass it in — never a constant here. Failure reasons are machine
// codes; Arabic messages are UI territory (@sharq/locales). Business bounds
// (maxMinor / minMinor, EC-32/33) stay plugin-side — this layer guards
// parse validity and safe-integer overflow only.

// Digits: Arabic-Indic U+0660-0669 and Extended Arabic-Indic U+06F0-06F9.
// Decimal separators: `.` U+002E and `٫` U+066B. Grouping separators are
// stripped (`,` U+002C, `٬` U+066C, the keyboard Arabic comma `،` U+060C,
// NBSP U+00A0, narrow NBSP U+202F, space). Invisible bidi marks from RTL
// copy-paste carry no numeric meaning and are stripped too.
const ARABIC_INDIC_START = 0x0660;
const EXTENDED_ARABIC_INDIC_START = 0x06f0;
const DIGIT_COUNT = 10;
const ASCII_ZERO = 0x30;
const DECIMAL_SEPARATORS = new Set([".", "\u066b"]);
const GROUPING_SEPARATORS = new Set([
  ",",
  "\u060c",
  "\u066c",
  "\u00a0",
  "\u202f",
  " ",
]);
const MINUS_SIGNS = new Set(["-", "\u2212"]);
const BIDI_MARKS = new Set(["\u200e", "\u200f", "\u061c"]);
// §5.2 currency.minorUnitScale: int 2..4 — the registry enforces it; this
// asserts defensively because a wrong scale silently corrupts all math.
const SCALE_MIN = 2;
const SCALE_MAX = 4;

export type MoneyNormalizeErrorCode =
  | "EMPTY"
  | "INVALID_CHARS"
  | "NEGATIVE"
  | "MULTIPLE_DECIMAL_SEPARATORS"
  | "TOO_MANY_DECIMALS" // EC-34 — more fraction digits than the scale
  | "OVERFLOW"; // beyond Number.MAX_SAFE_INTEGER (EC-32's maxMinor stays plugin-side)

export type MoneyNormalizeResult =
  { ok: true; minor: number } | { ok: false; code: MoneyNormalizeErrorCode };

/** Maps one char to an ASCII digit string, or null if it is not a digit. */
function digitValue(ch: string): string | null {
  const code = ch.codePointAt(0) ?? NaN;
  if (code >= ARABIC_INDIC_START && code < ARABIC_INDIC_START + DIGIT_COUNT) {
    return String.fromCharCode(code - ARABIC_INDIC_START + ASCII_ZERO);
  }
  if (
    code >= EXTENDED_ARABIC_INDIC_START &&
    code < EXTENDED_ARABIC_INDIC_START + DIGIT_COUNT
  ) {
    return String.fromCharCode(code - EXTENDED_ARABIC_INDIC_START + ASCII_ZERO);
  }
  return ch >= "0" && ch <= "9" ? ch : null;
}

function assertScale(scale: number): void {
  if (!Number.isInteger(scale) || scale < SCALE_MIN || scale > SCALE_MAX) {
    throw new RangeError(
      `scale must be an integer ${SCALE_MIN}..${SCALE_MAX} (§5.2 currency.minorUnitScale)`,
    );
  }
}

type ScannedAmount =
  | { ok: true; whole: string; frac: string }
  | { ok: false; code: MoneyNormalizeErrorCode };

/** Char walk only — every rejection below is a per-character verdict. */
function scanAmount(trimmed: string): ScannedAmount {
  let whole = "";
  let frac = "";
  let seenDecimal = false;
  for (const ch of trimmed) {
    const digit = digitValue(ch);
    if (digit !== null) {
      if (seenDecimal) frac += digit;
      else whole += digit;
      continue;
    }
    if (MINUS_SIGNS.has(ch)) return { ok: false, code: "NEGATIVE" };
    if (DECIMAL_SEPARATORS.has(ch)) {
      if (seenDecimal) {
        return { ok: false, code: "MULTIPLE_DECIMAL_SEPARATORS" };
      }
      seenDecimal = true;
      continue;
    }
    if (GROUPING_SEPARATORS.has(ch) || BIDI_MARKS.has(ch)) continue;
    return { ok: false, code: "INVALID_CHARS" };
  }
  return { ok: true, whole, frac };
}

/**
 * EC-31: Arabic-Indic digits / `٫` / thousands separators → integer minor.
 * EC-34 rejects more fraction digits than the scale (a typo, not rounding).
 * Zero parses to 0 (EC-33's minMinor=0 check is the caller's).
 */
export function normalizeAmountToMinor(
  input: string,
  scale: number,
): MoneyNormalizeResult {
  assertScale(scale);
  const trimmed = input.trim();
  if (trimmed.length === 0) return { ok: false, code: "EMPTY" };
  const scan = scanAmount(trimmed);
  if (!scan.ok) return scan;

  if (scan.frac.length > scale) return { ok: false, code: "TOO_MANY_DECIMALS" };
  const scalePow = 10 ** scale;
  const wholeVal = scan.whole === "" ? 0 : Number(scan.whole);
  // Inexact float parse is fine above safe range — the check still rejects.
  if (wholeVal > Number.MAX_SAFE_INTEGER / scalePow) {
    return { ok: false, code: "OVERFLOW" };
  }
  const fracVal = scan.frac === "" ? 0 : Number(scan.frac.padEnd(scale, "0"));
  const minor = wholeVal * scalePow + fracVal;
  if (!Number.isSafeInteger(minor)) return { ok: false, code: "OVERFLOW" };
  return { ok: true, minor };
}

/** The display-boundary inverse (§6.2): minor → decimal number for Intl (§14.2). */
export function minorToDecimal(minor: number, scale: number): number {
  assertScale(scale);
  if (!Number.isSafeInteger(minor)) {
    throw new RangeError("minor must be a safe integer");
  }
  return minor / 10 ** scale;
}
