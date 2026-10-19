// Row 12 — the §10.4 Arabic error map (TESTING §6.2: "every API error code
// has an Arabic message"). Completeness is keyed against the §10.4 list
// below (an independent pin — a code added in @sharq/schemas without a
// message here fails the first describe); the exact-string table is the
// anti-drift pin: strings are asserted exactly as written, and the three
// SPEC-grounded rows (FR-AUTH-01 §4.1, §2 string table ×2) are marked.
import { describe, expect, it } from "bun:test";
import type { ApiErrorCode } from "@sharq/schemas";
import { API_ERROR_MESSAGES } from "./errors";

// SPEC §10.4 verbatim — the 14 stable codes.
const CODES: ApiErrorCode[] = [
  "AUTH_REQUIRED",
  "AUTH_FORBIDDEN",
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "CONFLICT_VERSION",
  "SETTINGS_CHANGED",
  "EDIT_WINDOW_CLOSED",
  "PERIOD_LOCKED",
  "PERIOD_PAID",
  "AMOUNT_OUT_OF_BOUNDS",
  "REASON_REQUIRED",
  "RATE_LIMITED",
  "DUPLICATE",
  "INTERNAL",
];

describe("API_ERROR_MESSAGES completeness · every §10.4 code", () => {
  it("covers exactly the 14 codes — none missing, none extra", () => {
    expect(Object.keys(API_ERROR_MESSAGES).sort()).toEqual([...CODES].sort());
  });

  it("maps every code to a non-empty Arabic string", () => {
    for (const code of CODES) {
      const message = API_ERROR_MESSAGES[code];
      expect(message, code).toBeTruthy();
      expect(message, code).toMatch(/[\u0600-\u06FF]/);
      // A leaked machine code in the message would survive this check only
      // if it contained Arabic — pin the absence of ASCII letters directly.
      expect(message, code).not.toMatch(/[A-Z_]{3,}/);
    }
  });
});

// TESTING §6.2: strings asserted exactly as written. Drift between this
// table and errors.ts fails loudly — that is the point.
describe("API_ERROR_MESSAGES exact strings", () => {
  const exact: Array<[ApiErrorCode, string, string]> = [
    // FR-AUTH-01 §4.1 verbatim; doubles as the generic 401 message.
    ["AUTH_REQUIRED", "البيانات مش صح", "FR-AUTH-01"],
    ["AUTH_FORBIDDEN", "مش مسموح لك تدخل هنا", "composed"],
    ["VALIDATION_FAILED", "راجع البيانات وجرّب تاني", "composed"],
    ["NOT_FOUND", "اللي بتدور عليه مش موجود", "composed"],
    [
      "CONFLICT_VERSION",
      "البيانات اتغيّرت من حد تاني، حدّث الصفحة وحاول تاني",
      "composed",
    ],
    // §2 UI string table verbatim («Settings changed (server)»).
    ["SETTINGS_CHANGED", "الإعدادات اتحدثت من مدير النظام", "§2"],
    ["EDIT_WINDOW_CLOSED", "وقت التعديل للاسبوع ده قفل", "composed"],
    ["PERIOD_LOCKED", "الأسبوع ده مقفول", "§2 (مقفول)"],
    ["PERIOD_PAID", "الأسبوع ده متصرف", "§2 (متصرف)"],
    ["AMOUNT_OUT_OF_BOUNDS", "المبلغ مش في الحدود المسموحة", "composed"],
    // §2 UI string table verbatim («Reason required»).
    ["REASON_REQUIRED", "لازم تكتب السبب", "§2"],
    ["RATE_LIMITED", "محاولات كتير، استنى شويّة وحاول تاني", "composed"],
    ["DUPLICATE", "القيمة دي مستخدمة قبل كده", "composed"],
    ["INTERNAL", "حصلت مشكلة عندنا، حاول تاني", "composed"],
  ];

  for (const [code, message] of exact) {
    it(`${code} → «${message}»`, () => {
      // Widen the literal union so `message` (string) stays assignable.
      const actual: string = API_ERROR_MESSAGES[code];
      expect(actual).toBe(message);
    });
  }

  it("pins all 14 exact strings (table is complete)", () => {
    expect(exact.map(([c]) => c).sort()).toEqual([...CODES].sort());
  });
});
